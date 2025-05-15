import type { Context } from "hono";
import { prisma } from "../config/db.js";

export const createReports = async (c: Context) => {
  try {
    const body = await c.req.json();

    if (!Array.isArray(body)) {
      return c.json(
        {
          success: false,
          message: "Request body must be an array of reports.",
        },
        400
      );
    }

    type ReportInput = {
      campaign_id: number;
      kol_id: number;
      like_count: number;
      comment_count: number;
      share_count: number;
      save_count: number;
      engagement: number;
      reach: number;
      er: number;
      cpe: number;
    };

    // Validasi & pisahkan data valid dan invalid
    const errors: Array<{ index: number; message: string }> = [];
    const validReports: ReportInput[] = [];

    body.forEach((item: any, idx: number) => {
      const {
        campaign_id,
        kol_id,
        like_count,
        comment_count,
        share_count,
        save_count,
        engagement,
        reach,
        er,
        cpe,
      } = item;

      if (
        typeof campaign_id !== "number" ||
        typeof kol_id !== "number" ||
        typeof like_count !== "number" ||
        typeof comment_count !== "number" ||
        typeof share_count !== "number" ||
        typeof save_count !== "number" ||
        typeof engagement !== "number" ||
        typeof reach !== "number" ||
        typeof er !== "number" ||
        typeof cpe !== "number"
      ) {
        errors.push({
          index: idx,
          message:
            "Invalid or missing fields. Required: campaign_id, kol_id, like_count, comment_count, share_count, save_count, engagement, reach, er, cpe.",
        });
      } else {
        validReports.push(item as ReportInput);
      }
    });

    // Cek yang sudah ada di DB (berdasarkan campaign_id + kol_id)
    const existingPairs = await prisma.kol_reports.findMany({
      where: {
        OR: validReports.map(({ campaign_id, kol_id }) => ({
          campaign_id,
          kol_id,
        })),
      },
      select: {
        campaign_id: true,
        kol_id: true,
      },
    });

    // Buat Set supaya mudah cek existing
    const existingSet = new Set(
      existingPairs.map((e) => `${e.campaign_id}-${e.kol_id}`)
    );

    // Filter yang sudah ada dan berikan error
    const filteredReports = validReports.filter(
      ({ campaign_id, kol_id }, idx) => {
        if (existingSet.has(`${campaign_id}-${kol_id}`)) {
          errors.push({
            index: idx,
            message: `Report for campaign_id=${campaign_id} and kol_id=${kol_id} already exists.`,
          });
          return false; // skip insert
        }
        return true;
      }
    );

    // Insert batch yang valid dan belum ada
    if (filteredReports.length > 0) {
      await prisma.kol_reports.createMany({
        data: filteredReports,
        skipDuplicates: true, // ekstra safety, tapi seharusnya sudah dicek
      });
    }

    return c.json(
      {
        success: errors.length === 0,
        message:
          errors.length === 0
            ? "Reports created successfully."
            : "Some reports could not be created.",
        errors,
        insertedCount: filteredReports.length,
      },
      errors.length === 0 ? 201 : 207 // 207 Multi-Status
    );
  } catch (err) {
    return c.json(
      {
        success: false,
        message: "Failed to create reports.",
        error: err instanceof Error ? err.message : String(err),
      },
      500
    );
  }
};

type UpdatableKolReportFields = {
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  save_count?: number;
  engagement?: number;
  reach?: number;
  er?: number;
  cpe?: number;
};

export const updateReport = async (c: Context) => {
  try {
    const id = Number(c.req.param("id"));
    if (!id) {
      return c.json({ success: false, message: "Report ID is required." }, 400);
    }

    const body: Partial<UpdatableKolReportFields> = await c.req.json();

    const existingReport = await prisma.kol_reports.findUnique({
      where: { id },
    });

    if (!existingReport) {
      return c.json({ success: false, message: "Report not found." }, 404);
    }

    const allowedFields: (keyof UpdatableKolReportFields)[] = [
      "like_count",
      "comment_count",
      "share_count",
      "save_count",
      "engagement",
      "reach",
      "er",
      "cpe",
    ];

    const dataToUpdate: Partial<UpdatableKolReportFields> = {};
    let isChanged = false;

    for (const key of allowedFields) {
      if (key in body) {
        const newValue = body[key];
        const oldValue = existingReport[key];

        if (newValue !== undefined && newValue !== oldValue) {
          dataToUpdate[key] = newValue as any;
          isChanged = true;
        }
      }
    }

    if (!isChanged) {
      return c.json({ success: true, message: "No changes made." });
    }

    await prisma.kol_reports.update({
      where: { id },
      data: dataToUpdate,
    });

    return c.json({ success: true, message: "Report updated successfully." });
  } catch (err) {
    return c.json(
      {
        success: false,
        message: "An error occurred while updating the report.",
        error: err instanceof Error ? err.message : String(err),
      },
      500
    );
  }
};

export const getReports = async (c: Context) => {
  try {
    const campaignId = Number(c.req.param("id"));
    if (!campaignId) {
      return c.json(
        { success: false, message: "Campaign ID is required." },
        400
      );
    }

    // Optional: cek campaign ada atau tidak
    const campaignExists = await prisma.campaigns.findUnique({
      where: { id: campaignId },
    });

    if (!campaignExists) {
      return c.json({ success: false, message: "Campaign not found." }, 404);
    }

    // Ambil report kol untuk campaign itu, bisa join kol data juga
    const reports = await prisma.kol_reports.findMany({
      where: { campaign_id: campaignId },
      include: {
        kol: {
          select: {
            id: true,
            name: true,
            // field kol lain yg ingin tampil di report
          },
        },
      },
    });

    return c.json({ success: true, data: reports });
  } catch (err) {
    return c.json(
      {
        success: false,
        message: "Failed to fetch reports.",
        error: err instanceof Error ? err.message : String(err),
      },
      500
    );
  }
};

export const deleteReport = async (c: Context) => {
  try {
    const id = Number(c.req.param("id"));
    if (!id) {
      return c.json({ success: false, message: "Report ID is required." }, 400);
    }

    const existingReport = await prisma.kol_reports.findUnique({
      where: { id },
    });

    if (!existingReport) {
      return c.json({ success: false, message: "Report not found." }, 404);
    }

    await prisma.kol_reports.delete({
      where: { id },
    });

    return c.json({ success: true, message: "Report deleted successfully." });
  } catch (err) {
    return c.json(
      {
        success: false,
        message: "Failed to delete report.",
        error: err instanceof Error ? err.message : String(err),
      },
      500
    );
  }
};
