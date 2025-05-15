import type { Context } from "hono";
import { prisma } from "../config/db.js";
import { Pagination } from "../helpers/pagination.js";
import { Prisma } from "@prisma/client";

export const createCampaign = async (c: Context) => {
  try {
    const body = await c.req.json();
    const user = c.get("user");

    const requiredFields = [
      "name",
      "kol_type_id",
      "target_niche",
      "target_engagement",
      "target_reach",
      "target_gender",
      "target_gender_min",
      "target_age_range",
      "start_date",
      "end_date",
      "kol_ids",
    ];

    const missingField = requiredFields.find(
      (field) => body[field] === undefined || body[field] === null
    );

    if (missingField) {
      return c.json(
        {
          success: false,
          message: `Field '${missingField}' is required.`,
        },
        400
      );
    }

    if (!Array.isArray(body.kol_ids) || body.kol_ids.length === 0) {
      return c.json(
        {
          success: false,
          message: "kol_ids must be a non-empty array.",
        },
        400
      );
    }

    const campaign = await prisma.campaigns.create({
      data: {
        user_id: user.id,
        name: body.name,
        kol_type_id: body.kol_type_id,
        target_niche: body.target_niche,
        target_engagement: body.target_engagement,
        target_reach: body.target_reach,
        target_gender: body.target_gender,
        target_gender_min: body.target_gender_min,
        target_age_range: body.target_age_range,
        start_date: new Date(body.start_date),
        end_date: new Date(body.end_date),
      },
    });

    const kolRelations = body.kol_ids.map((kol_id: number) => ({
      campaign_id: campaign.id,
      kol_id,
    }));

    await prisma.campaign_kol.createMany({
      data: kolRelations,
      skipDuplicates: true,
    });

    return c.json(
      {
        success: true,
        message: "Campaign created successfully.",
      },
      201
    );
  } catch (err) {
    return c.json(
      {
        success: false,
        message: "An error occurred while creating the campaign:",
        error: err instanceof Error ? err.message : String(err),
      },
      500
    );
  }
};

export const getCampaigns = async (c: Context) => {
  try {
    const page = Number(c.req.query("page") || "1");
    const limit = Number(c.req.query("limit") || "10");
    const offset = (page - 1) * limit;
    const search = c.req.query("search")?.toString() || "";

    const where = search
      ? {
          name: {
            contains: search,
            mode: Prisma.QueryMode.insensitive,
          },
        }
      : {};

    const total = await prisma.campaigns.count({ where });

    const campaigns = await prisma.campaigns.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
      include: {
        campaign_kols: {
          select: {
            kol: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const campaignsWithKols = campaigns.map((campaign) => ({
      ...campaign,
      kols: campaign.campaign_kols.map((ck) => ck.kol),
      campaign_kols: undefined,
    }));

    return c.json({
      success: true,
      data: campaignsWithKols,
      pagination: Pagination({ page, limit, total }),
    });
  } catch (err) {
    return c.json(
      {
        success: false,
        message: "Failed to fetch campaigns",
        error: err instanceof Error ? err.message : String(err),
      },
      500
    );
  }
};

type CampaignUpdateData = Prisma.campaignsUpdateInput;

export const updateCampaign = async (c: Context) => {
  try {
    const body = await c.req.json();
    const campaign_id = Number(body.id);
    if (!campaign_id) {
      return c.json(
        { success: false, message: "Campaign id is required." },
        400
      );
    }

    const { id, kol_ids, kol_type_id, ...campaignData } = body;

    const allowedFields: (keyof CampaignUpdateData)[] = [
      "name",
      "target_niche",
      "target_engagement",
      "target_reach",
      "target_gender",
      "target_gender_min",
      "target_age_range",
      "start_date",
      "end_date",
    ];

    const existingCampaign = await prisma.campaigns.findUnique({
      where: { id: campaign_id },
      include: { campaign_kols: true },
    });

    if (!existingCampaign) {
      return c.json({ success: false, message: "Campaign not found." }, 404);
    }

    const dataToUpdate: Partial<CampaignUpdateData> = {};
    let isCampaignChanged = false;

    for (const key of allowedFields) {
      if (key in campaignData) {
        dataToUpdate[key] = campaignData[key];
      }
    }

    // Konversi tanggal jika string
    if (
      dataToUpdate.start_date &&
      typeof dataToUpdate.start_date === "string"
    ) {
      dataToUpdate.start_date = new Date(dataToUpdate.start_date);
    }
    if (dataToUpdate.end_date && typeof dataToUpdate.end_date === "string") {
      dataToUpdate.end_date = new Date(dataToUpdate.end_date);
    }

    // Cek perubahan kol_type_id secara eksplisit
    if (typeof kol_type_id === "number") {
      const existingKolTypeId = existingCampaign.kol_type_id;
      if (existingKolTypeId !== kol_type_id) {
        isCampaignChanged = true;
        (dataToUpdate as any).kol_type = {
          connect: { id: kol_type_id },
        };
      }
    }

    // Cek apakah ada perubahan pada data campaign

    for (const key of allowedFields) {
      if (!(key in dataToUpdate)) continue;

      const valueInDb = (existingCampaign as any)[key];
      const valueInUpdate = dataToUpdate[key];

      if (valueInUpdate === undefined) continue;

      if (valueInDb instanceof Date && valueInUpdate instanceof Date) {
        if (valueInDb.toISOString() !== valueInUpdate.toISOString()) {
          isCampaignChanged = true;
          break;
        }
      } else if (valueInDb !== valueInUpdate) {
        isCampaignChanged = true;
        break;
      }
    }

    // Cek perubahan kol_ids
    let isKolIdsChanged = false;
    if (Array.isArray(kol_ids)) {
      const existingKolIds = existingCampaign.campaign_kols
        .map((k) => k.kol_id)
        .sort();
      const newKolIds = kol_ids.slice().sort();
      if (
        existingKolIds.length !== newKolIds.length ||
        existingKolIds.some((val, idx) => val !== newKolIds[idx])
      ) {
        isKolIdsChanged = true;
      }
    }

    // Early return jika tidak ada perubahan
    if (!isCampaignChanged && !isKolIdsChanged) {
      return c.json({ success: true, message: "No changes made." });
    }

    // Update campaign jika ada perubahan
    if (isCampaignChanged) {
      await prisma.campaigns.update({
        where: { id: campaign_id },
        data: dataToUpdate,
      });
    }

    // Update kol_ids jika berubah
    if (isKolIdsChanged) {
      await prisma.campaign_kol.deleteMany({ where: { campaign_id } });
      const campaignKolsData = kol_ids.map((kolId: number) => ({
        campaign_id,
        kol_id: kolId,
      }));
      await prisma.campaign_kol.createMany({
        data: campaignKolsData,
        skipDuplicates: true,
      });
    }

    return c.json({ success: true, message: "Campaign updated successfully." });
  } catch (err) {
    return c.json(
      {
        success: false,
        message: "An error occurred while updating the campaign.",
        error: err instanceof Error ? err.message : String(err),
      },
      500
    );
  }
};

export const deleteCampaign = async (c: Context) => {
  const id = Number(c.req.param("id"));

  if (!id || isNaN(id)) {
    return c.json(
      {
        success: false,
        message: "Valid Campaign ID is required.",
      },
      400
    );
  }

  try {
    const existing = await prisma.campaigns.findUnique({ where: { id } });

    if (!existing) {
      return c.json(
        {
          success: false,
          message: "Campaign not found.",
        },
        404
      );
    }

    await prisma.campaigns.delete({ where: { id } });

    return c.json(
      {
        success: true,
        message: "Campaign successfully deleted.",
      },
      200
    );
  } catch (err) {
    return c.json(
      {
        success: false,
        message: "Failed to delete campaign.",
        error: err instanceof Error ? err.message : String(err),
      },
      500
    );
  }
};
