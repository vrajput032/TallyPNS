import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ApiError } from "./errorHandler.js";

export type RoleName = "ADMIN" | "STAFF";

export interface AuthPayload {
  sub: string;
  username: string;
  email: string;
  role: RoleName;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    throw new ApiError(401, "Missing access token");
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    throw new ApiError(401, "Invalid or expired access token");
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    throw new ApiError(401, "Missing access token");
  }

  switch (req.user.role) {
    case "ADMIN":
      next();
      return;
    case "STAFF":
      throw new ApiError(403, "Admin access required");
    default: {
      const _exhaustive: never = req.user.role;
      throw new ApiError(403, `Unhandled role: ${_exhaustive}`);
    }
  }
}

export function requireCanDelete(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) {
    throw new ApiError(401, "Missing access token");
  }

  switch (req.user.role) {
    case "ADMIN":
      next();
      return;
    case "STAFF":
      throw new ApiError(403, "You do not have permission to delete");
    default: {
      const _exhaustive: never = req.user.role;
      throw new ApiError(403, `Unhandled role: ${_exhaustive}`);
    }
  }
}
