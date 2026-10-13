import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { getDashboardSummary } from "./dashboard.service.js";
import { getMonthlySales, getCustomerWiseSales } from "./dashboard.service.js";
import { indusPoPdfPath } from "./indusPo.js";
import { ApiError } from "../../middleware/errorHandler.js";

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
  "/indus-po/:poNo/pdf",
  asyncHandler(async (req, res) => {
    const poNo = String(req.params.poNo);
    const filePath = indusPoPdfPath(poNo);
    if (!filePath) throw new ApiError(404, "PO not found");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${poNo}.pdf"`);
    res.setHeader("Cache-Control", "private, max-age=3600");
    await new Promise<void>((resolve, reject) => {
      res.sendFile(filePath, (error) => (error ? reject(new ApiError(404, "PO PDF not found")) : resolve()));
    });
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
