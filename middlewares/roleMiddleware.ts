import type { Context, Next } from "hono";

export const checkRole = (allowedRoles: string[]) => {
  return async (c: Context, next: Next) => {
    const user = c.get("user");

    if (!allowedRoles.includes(user.role)) {
      c.status(403);
      return c.json({
        success: false,
        message: "Akses ditolak: Anda tidak memiliki izin",
      });
    }

    await next();
  };
};

export const isAdmin = checkRole(["ADMIN"]);

export const isKOLManager = checkRole(["KOL_MANAGER"]);

export const isBrand = checkRole(["BRAND"]);
