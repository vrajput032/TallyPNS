import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { ApiError } from "../../middleware/errorHandler.js";
import { isScrapGrade, type ScrapGrade } from "../../lib/manufacturingPnl.js";
import { getMonthProfitLoss, getProfitLossSummary } from "./profit-loss.service.js";

export const profitLossRouter = Router();

profitLossRouter.use(requireAuth);

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

function parseScrapGrade(req: { query: Record<string, unknown> }): ScrapGrade {
  const raw = req.query.scrapGrade;
  if (raw === undefined || raw === "") return "iron87";
  if (typeof raw !== "string" || !isScrapGrade(raw)) {
    throw new ApiError(400, "scrapGrade must be iron87 or iron95");
  }
  return raw;
}

profitLossRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const scrapGrade = parseScrapGrade(req);
    res.json(await getProfitLossSummary(scrapGrade));
  })
);

profitLossRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { month, year } = parseMonthYear(req);
    const scrapGrade = parseScrapGrade(req);
    const now = new Date();
    const report = await getMonthProfitLoss(
      month ?? now.getMonth() + 1,
      year ?? now.getFullYear(),
      scrapGrade
    );
    res.json(report);
  })
);
