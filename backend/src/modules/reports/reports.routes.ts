import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import {
  getBalanceSheet,
  getProfitAndLoss,
  getStockReport,
  getTrialBalance,
} from "./reports.service.js";

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

reportsRouter.get(
  "/balance-sheet",
  asyncHandler(async (req, res) => {
    const asOn = typeof req.query.asOn === "string" ? new Date(req.query.asOn) : undefined;
    res.json(await getBalanceSheet(asOn));
  })
);

reportsRouter.get(
  "/trial-balance",
  asyncHandler(async (req, res) => {
    const asOn = typeof req.query.asOn === "string" ? new Date(req.query.asOn) : undefined;
    res.json(await getTrialBalance(asOn));
  })
);
