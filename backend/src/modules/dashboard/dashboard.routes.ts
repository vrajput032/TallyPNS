import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { getDashboardSummary } from "./dashboard.service.js";
import { getMonthlySales, getCustomerWiseSales } from "./dashboard.service.js";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);

dashboardRouter.get(
  "/summary",
  asyncHandler(async (_req, res) => {
    const summary = await getDashboardSummary();
    res.json(summary);
  })
);

dashboardRouter.get(
  "/sales/monthly",
  asyncHandler(async (_req, res) => {
    const data = await getMonthlySales();
    res.json(data);
  })
);

dashboardRouter.get(
  "/sales/by-customer",
  asyncHandler(async (_req, res) => {
    const data = await getCustomerWiseSales();
    res.json(data);
  })
);
