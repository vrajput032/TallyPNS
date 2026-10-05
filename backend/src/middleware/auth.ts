import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { sessionIsRevoked } from "../lib/sessionRevocation.js";
import { ApiError } from "./errorHandler.js";

export type RoleName = "ADMIN" | "STAFF";

export interface AuthPayload {
  sub: string;
  username: string;
  email: string;
  role: RoleName;
  /** Client-reported device/browser label from login (optional on older tokens). */
  deviceName?: string;
  iat?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  void (async () => {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

    if (!token) {
      throw new ApiError(401, "Missing access token");
    }

    let payload: AuthPayload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
    } catch {
      throw new ApiError(401, "Invalid or expired access token");
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { refreshToken: true },
    });
    if (!user || sessionIsRevoked(user.refreshToken, payload.iat)) {
      throw new ApiError(401, "Session expired. Please log in again.");
    }

    req.user = payload;
    next();
  })().catch((error) => {
    next(error instanceof ApiError ? error : new ApiError(401, "Invalid or expired access token"));
  });
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
