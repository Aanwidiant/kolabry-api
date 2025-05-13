import type { Context } from "hono";
import { prisma } from "../config/db.js";
import { validateKol } from "../validations/kolValidation.js";
import type { KolInput } from "../types/kolTypes.js";
import { Prisma, NicheType } from "@prisma/client";
import { Pagination } from "../helpers/pagination.js";

// Create KOL data
export const createKol = async (c: Context) => {
  try {
    const body = await c.req.json();
    const dataArray = Array.isArray(body) ? body : [body];

    const results: { success: boolean; message: string; data?: KolInput }[] =
      [];

    for (const [index, item] of dataArray.entries()) {
      const requiredFields = [
        "name",
        "niche",
        "followers",
        "engagement_rate",
        "reach",
        "rate_card",
        "audience_male",
        "audience_female",
        "audience_age_range",
      ];

      const missingField = requiredFields.find(
        (field) => item[field] === undefined || item[field] === null
      );

      if (missingField) {
        results.push({
          success: false,
          message: `Item ${index + 1}: Field '${missingField}' is required.`,
        });
        continue;
      }

      const validation = validateKol(item);
      if (!validation.valid) {
        results.push({
          success: false,
          message: `Item ${index + 1}: ${validation.message}`,
        });
        continue;
      }

      try {
        await prisma.kols.create({ data: item });
        results.push({
          success: true,
          message: `Item ${index + 1}: KOL data created successfully.`,
        });
      } catch (error) {
        results.push({
          success: false,
          message: `Item ${index + 1}: Failed to create KOL data. ${
            error instanceof Error ? error.message : String(error)
          }`,
        });
      }
    }
    return c.json(
      {
        success: true,
        results,
      },
      201
    );
  } catch (err) {
    return c.json(
      {
        success: false,
        message: "An error occurred on the server.",
        error: err instanceof Error ? err.message : String(err),
      },
      500
    );
  }
};

// Get KOL data
export const getKols = async (c: Context) => {
  try {
    const { search = "", page = "1", limit = "10", niche } = c.req.query();

    const currentPage = parseInt(page, 10);
    const take = parseInt(limit, 10);
    const skip = (currentPage - 1) * take;

    const isValidNiche = (value: string): value is NicheType =>
      Object.values(NicheType).includes(value as NicheType);

    const whereClause: Prisma.kolsWhereInput = {
      ...(niche && isValidNiche(niche) ? { niche: niche as NicheType } : {}),
      ...(search
        ? {
            name: {
              contains: search,
              mode: "insensitive",
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      prisma.kols.findMany({
        where: whereClause,
        skip,
        take,
        orderBy: { id: "asc" },
      }),
      prisma.kols.count({ where: whereClause }),
    ]);

    if (data.length === 0) {
      return c.json(
        {
          success: true,
          message: "No KOL data found.",
        },
        200
      );
    }

    return c.json(
      {
        success: true,
        data,
        pagination: Pagination({
          page: currentPage,
          limit: take,
          total,
        }),
      },
      200
    );
  } catch (err) {
    return c.json(
      {
        success: false,
        message: "An error occurred while fetching KOLs.",
        error: err instanceof Error ? err.message : String(err),
      },
      500
    );
  }
};

// Update KOL data
export const updateKol = async (c: Context) => {
  try {
    const body = await c.req.json();

    if (!body.id) {
      return c.json(
        {
          success: false,
          message: "KOL ID is required.",
        },
        400
      );
    }

    const existingKol = await prisma.kols.findUnique({
      where: { id: body.id },
    });

    if (!existingKol) {
      return c.json(
        {
          success: false,
          message: "KOL data not found.",
        },
        404
      );
    }

    const updatedData = { ...existingKol, ...body };
    const validation = validateKol(updatedData);

    if (!validation.valid) {
      return c.json(
        {
          success: false,
          message: validation.message,
        },
        400
      );
    }

    const { id, ...updateFields } = body;

    await prisma.kols.update({
      where: { id },
      data: updateFields,
    });

    return c.json(
      {
        success: true,
        message: "KOL updated successfully.",
      },
      200
    );
  } catch (err) {
    return c.json(
      {
        success: false,
        message: "An error occurred on the server.",
        error: err instanceof Error ? err.message : String(err),
      },
      500
    );
  }
};

// Delete KOL data
export const deleteKol = async (c: Context) => {
  const id = parseInt(c.req.param("id"));

  if (!id) {
    return c.json(
      {
        success: false,
        message: "KOL ID is required.",
      },
      400
    );
  }

  try {
    const existing = await prisma.kols.findUnique({ where: { id } });

    if (!existing) {
      return c.json(
        {
          success: false,
          message: "KOL data not found.",
        },
        404
      );
    }

    await prisma.kols.delete({ where: { id } });
    return c.json(
      {
        success: true,
        message: "KOL data successfully deleted.",
      },
      200
    );
  } catch (err) {
    return c.json(
      {
        success: false,
        message: "Failed to delete KOL data.",
        error: err instanceof Error ? err.message : String(err),
      },
      500
    );
  }
};
