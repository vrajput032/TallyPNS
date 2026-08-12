import type { RequestHandler } from "express";
import { ApiError } from "./errorHandler.js";

const DEFAULT_DELETE_PIN = "940400";

export const requireDeletePin: RequestHandler = (req, _res, next) => {
  const expected = process.env.DELETE_PIN ?? DEFAULT_DELETE_PIN;
  const pin = req.get("x-delete-pin") ?? (req.body as { pin?: string } | undefined)?.pin;

  if (!pin || pin !== expected) {
    throw new ApiError(403, "Invalid deletion PIN");
  }

  next();
};
