import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { ApiError } from "../../middleware/errorHandler.js";
import { listActivity } from "./activity.js";
import type { ActivityModule } from "@prisma/client";

export const activityRouter = Router();

activityRouter.use(requireAuth);

const MODULES = ["SALES", "PURCHASE", "RAW_MATERIAL", "INVENTORY", "PAYMENT"] as const;
const MODULE_SET = new Set<string>(MODULES);

function parseModule(raw: unknown): ActivityModule | undefined {
  if (typeof raw !== "string" || raw === "") return undefined;
  if (!MODULE_SET.has(raw)) {
    throw new ApiError(400, "Invalid module");
  }
  return raw as ActivityModule;
}

function parseLimit(raw: unknown): number | undefined {
  if (typeof raw !== "string" || raw === "") return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) {
    throw new ApiError(400, "limit must be a number");
  }
  return n;
}

activityRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const logs = await listActivity({
      module: parseModule(req.query.module),
      limit: parseLimit(req.query.limit),
    });
    res.json(logs);
  })
);
