import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { ApiError } from "../../middleware/errorHandler.js";
import { getGstSummary } from "./gst.service.js";
import { buildGstr1Json } from "./gstr1-json.js";

export const gstRouter = Router();

gstRouter.use(requireAuth);

function parseMonthYear(req: { query: Record<string, unknown> }) {
  const monthRaw = typeof req.query.month === "string" ? Number(req.query.month) : undefined;
  const yearRaw = typeof req.query.year === "string" ? Number(req.query.year) : undefined;

  const month = monthRaw !== undefined && !Number.isNaN(monthRaw) ? monthRaw : undefined;
  const year = yearRaw !== undefined && !Number.isNaN(yearRaw) ? yearRaw : undefined;

  if (month !== undefined && (month < 1 || month > 12)) {
    throw new ApiError(400, "month must be between 1 and 12");
  }
  if (year !== undefined && (year < 2000 || year > 2100)) {
    throw new ApiError(400, "year is out of range");
  }

  return { month, year };
}

gstRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const { month, year } = parseMonthYear(req);
    const summary = await getGstSummary(month, year);
    res.json(summary);
  })
);

/** Tally-style GSTR-1 JSON for GST portal Prepare Offline upload */
gstRouter.get(
  "/gstr1-json",
  asyncHandler(async (req, res) => {
    const { month, year } = parseMonthYear(req);
    const download = req.query.download === "1" || req.query.download === "true";
    const result = await buildGstr1Json(month, year);

    if (download) {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
      res.send(JSON.stringify(result.payload, null, 2));
      return;
    }

    res.json(result);
  })
);
