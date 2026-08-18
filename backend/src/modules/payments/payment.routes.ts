import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth, requireCanDelete } from "../../middleware/auth.js";
import { createReceiptSchema, createVendorPaymentSchema } from "./payment.schema.js";
import * as paymentService from "./payment.service.js";
import { routeParam } from "../../lib/routeParam.js";

export const paymentRouter = Router();

paymentRouter.use(requireAuth);

paymentRouter.post(
  "/receipts",
  asyncHandler(async (req, res) => {
    const data = createReceiptSchema.parse(req.body);
    const receipt = await paymentService.createReceipt(data);
    res.status(201).json(receipt);
  })
);

paymentRouter.delete(
  "/receipts/:id",
  requireCanDelete,
  asyncHandler(async (req, res) => {
    await paymentService.deleteReceipt(routeParam(req.params.id));
    res.status(204).send();
  })
);

paymentRouter.post(
  "/vendor-payments",
  asyncHandler(async (req, res) => {
    const data = createVendorPaymentSchema.parse(req.body);
    const payment = await paymentService.createVendorPayment(data);
    res.status(201).json(payment);
  })
);

paymentRouter.delete(
  "/vendor-payments/:id",
  requireCanDelete,
  asyncHandler(async (req, res) => {
    await paymentService.deleteVendorPayment(routeParam(req.params.id));
    res.status(204).send();
  })
);

paymentRouter.get(
  "/outstanding",
  asyncHandler(async (_req, res) => {
    const data = await paymentService.getPartyOutstanding();
    res.json(data);
  })
);

export const cashRouter = Router();
cashRouter.use(requireAuth);
cashRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await paymentService.listCashBankBook("CASH"));
  })
);

export const bankRouter = Router();
bankRouter.use(requireAuth);
bankRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json(await paymentService.listCashBankBook("BANK"));
  })
);
