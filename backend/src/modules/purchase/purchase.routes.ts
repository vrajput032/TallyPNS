import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { requireDeletePin } from "../../middleware/requireDeletePin.js";
import { createPurchaseBillSchema } from "./purchase.schema.js";
import * as purchaseService from "./purchase.service.js";

export const purchaseRouter = Router();

purchaseRouter.use(requireAuth);

purchaseRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const bills = await purchaseService.listPurchaseBills();
    res.json(bills);
  })
);

purchaseRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const bill = await purchaseService.getPurchaseBill(req.params.id);
    res.json(bill);
  })
);

purchaseRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createPurchaseBillSchema.parse(req.body);
    const bill = await purchaseService.createPurchaseBill(data);
    res.status(201).json(bill);
  })
);

purchaseRouter.delete(
  "/:id/permanent",
  requireDeletePin,
  asyncHandler(async (req, res) => {
    await purchaseService.permanentlyDeletePurchaseBill(req.params.id);
    res.status(204).send();
  })
);

purchaseRouter.post(
  "/:id/restore",
  asyncHandler(async (req, res) => {
    await purchaseService.restorePurchaseBill(req.params.id);
    res.status(204).send();
  })
);

purchaseRouter.delete(
  "/:id",
  requireDeletePin,
  asyncHandler(async (req, res) => {
    await purchaseService.deletePurchaseBill(req.params.id);
    res.status(204).send();
  })
);
