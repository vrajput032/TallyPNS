import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { routeParam } from "../../lib/routeParam.js";
import * as ledgerService from "./ledger.service.js";

export const ledgerRouter = Router();

ledgerRouter.use(requireAuth);

ledgerRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await ledgerService.listCustomerLedgers());
  })
);

ledgerRouter.get(
  "/suppliers",
  asyncHandler(async (_req, res) => {
    res.json(await ledgerService.listSupplierLedgers());
  })
);

ledgerRouter.get(
  "/suppliers/:supplierKey",
  asyncHandler(async (req, res) => {
    res.json(await ledgerService.getSupplierLedger(routeParam(req.params.supplierKey)));
  })
);

ledgerRouter.get(
  "/:customerId",
  asyncHandler(async (req, res) => {
    const ledger = await ledgerService.getCustomerLedger(routeParam(req.params.customerId));
    res.json(ledger);
  })
);
