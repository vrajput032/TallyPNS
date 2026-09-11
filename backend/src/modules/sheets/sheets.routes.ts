import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAdmin, requireAuth } from "../../middleware/auth.js";
import { ApiError } from "../../middleware/errorHandler.js";
import { getSheetsConfig } from "./sheets.config.js";
import { syncGoogleSheets } from "./sheets.sync.js";

export const sheetsRouter = Router();

sheetsRouter.get(
  "/status",
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const cfg = getSheetsConfig();
    res.json({
      enabled: cfg.enabled,
      spreadsheetId: cfg.spreadsheetId || null,
      clientEmail: cfg.clientEmail || null,
    });
  })
);

sheetsRouter.post(
  "/sync",
  requireAuth,
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const result = await syncGoogleSheets();
    if (result.skipped) {
      throw new ApiError(503, result.reason ?? "Sheets sync not configured");
    }
    if (!result.ok) {
      throw new ApiError(502, "Sheets sync failed");
    }
    res.json(result);
  })
);

/** Optional: curl with header X-Sheets-Cron-Secret for external hourly cron */
sheetsRouter.post(
  "/cron",
  asyncHandler(async (req, res) => {
    const cfg = getSheetsConfig();
    const secret = req.header("x-sheets-cron-secret")?.trim() ?? "";
    if (!cfg.cronSecret || secret !== cfg.cronSecret) {
      throw new ApiError(401, "Invalid cron secret");
    }
    const result = await syncGoogleSheets();
    if (result.skipped) {
      throw new ApiError(503, result.reason ?? "Sheets sync not configured");
    }
    res.json(result);
  })
);
