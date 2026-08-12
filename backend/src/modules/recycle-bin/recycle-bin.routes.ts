import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import * as purchaseService from "../purchase/purchase.service.js";
import * as salesService from "../sales/sales.service.js";

export const recycleBinRouter = Router();

recycleBinRouter.use(requireAuth);

recycleBinRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const [sales, purchase] = await Promise.all([
      salesService.listDeletedSalesInvoices(),
      purchaseService.listDeletedPurchaseBills(),
    ]);
    res.json({ sales, purchase });
  })
);
