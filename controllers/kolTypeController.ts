import type { Context } from "hono";
import { prisma } from "../config/db.js";
import { validateKolType } from "../validations/kolTypeValidation.js";
import { Prisma } from "@prisma/client";
import { Pagination } from "../helpers/pagination.js";

export const createKolType = async (c: Context) => {
  const body = await c.req.json();

  if (!body.name || !body.min_followers) {
    return c.json(
      {
        success: false,
        message: "name, min_followers is required",
      },
      400
    );
  }

  const existingName = await prisma.kol_types.findFirst({
    where: { name: body.name },
  });

  if (existingName) {
    return c.json(
      {
        success: false,
        message: "name KOL Type already used.",
      },
      400
    );
  }

  const validation = validateKolType(body);
  if (!validation.valid) {
    return c.json(
      {
        success: false,
        message: validation.message,
      },
      400
    );
  }

  try {
    const { name, min_followers, max_followers } = body;
    const newKolType = await prisma.kol_types.create({
      data: {
        name,
        min_followers,
        max_followers: max_followers ?? null,
      },
    });

    return c.json(
      {
        success: true,
        message: "KOL type successfully created.",
        data: newKolType,
      },
      201
    );
  } catch (err) {
    return c.json(
      {
        success: false,
        message: "An error occurred while creating KOL Type.",
        error: err instanceof Error ? err.message : String(err),
      },
      500
    );
  }
};

export const getKolTypes = async (c: Context) => {
  const { search = "", page = "1", limit = "10" } = c.req.query();

  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);
  const offset = (pageNumber - 1) * limitNumber;

  const whereClause = search
    ? {
        name: {
          contains: search,
          mode: Prisma.QueryMode.insensitive,
        },
      }
    : {};

  try {
    const kolTypes = await prisma.kol_types.findMany({
      where: whereClause,
      skip: offset,
      take: limitNumber,
    });

    const total = await prisma.kol_types.count({ where: whereClause });

    if (kolTypes.length === 0) {
      return c.json(
        {
          success: true,
          message: "No KOL Types found.",
        },
        200
      );
    }

    return c.json({
      success: true,
      data: kolTypes,
      pagination: Pagination({
        page: pageNumber,
        limit: limitNumber,
        total: total,
      }),
    });
  } catch (err) {
    return c.json(
      {
        success: false,
        message: "Failed to fetch KOL Types.",
        error: err instanceof Error ? err.message : String(err),
      },
      500
    );
  }
};

export const updateKolType = async (c: Context) => {
  const body = await c.req.json();

  const { id, name, min_followers, max_followers } = body;

  if (!name && min_followers === undefined && max_followers === undefined) {
    return c.json(
      {
        success: false,
        message: "No fields to update were provided.",
      },
      400
    );
  }
  const existingKolType = await prisma.kol_types.findUnique({
    where: { id },
  });

  if (!existingKolType) {
    return c.json({ success: false, message: "KOL Type not found" }, 404);
  }

  if (name) {
    const nameConflict = await prisma.kol_types.findFirst({
      where: {
        name,
        NOT: { id },
      },
    });

    if (nameConflict) {
      return c.json(
        {
          success: false,
          message: "Name is already used by another KOL type.",
        },
        400
      );
    }
  }

  const validation = validateKolType(body, existingKolType.min_followers);
  if (!validation.valid) {
    return c.json(
      {
        success: false,
        message: validation.message,
      },
      400
    );
  }

  try {
    const updatedKolType = await prisma.kol_types.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(min_followers !== undefined && { min_followers }),
        ...(max_followers !== undefined && { max_followers }),
      },
    });

    return c.json({
      success: true,
      message: "KOL type updated successfully.",
      data: updatedKolType,
    });
  } catch (err) {
    return c.json(
      {
        success: false,
        message: "Failed to update KOL type.",
        error: err instanceof Error ? err.message : String(err),
      },
      500
    );
  }
};

export const deleteKolType = async (c: Context) => {
  const id = parseInt(c.req.param("id"));

  if (!id) {
    return c.json(
      {
        success: false,
        message: "KOL Type ID is required.",
      },
      400
    );
  }

  try {
    const existing = await prisma.kol_types.findUnique({ where: { id } });

    if (!existing) {
      return c.json(
        {
          success: false,
          message: "KOL Type not found.",
        },
        404
      );
    }

    await prisma.kol_types.delete({ where: { id } });
    return c.json(
      {
        success: true,
        message: "KOL Type successfully deleted.",
      },
      200
    );
  } catch (err) {
    return c.json(
      {
        success: false,
        message: "Failed to delete KOL Type.",
        error: err instanceof Error ? err.message : String(err),
      },
      500
    );
  }
};
