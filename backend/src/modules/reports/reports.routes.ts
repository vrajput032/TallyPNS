import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { getProfitAndLoss, getStockReport } from "./reports.service.js";

export const reportsRouter = Router();

reportsRouter.use(requireAuth);

reportsRouter.get(
  "/profit-loss",
  asyncHandler(async (req, res) => {
    const from = typeof req.query.from === "string" ? new Date(req.query.from) : undefined;
    const to = typeof req.query.to === "string" ? new Date(req.query.to) : undefined;
    const report = await getProfitAndLoss(from, to);
    res.json(report);
  })
);

reportsRouter.get(
  "/stock",
  asyncHandler(async (_req, res) => {
    const report = await getStockReport();
    res.json(report);
  })
);
