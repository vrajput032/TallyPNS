import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth, requireCanDelete } from "../../middleware/auth.js";
import { createReceiptSchema, createVendorPaymentSchema } from "./payment.schema.js";
import * as paymentService from "./payment.service.js";
import { routeParam } from "../../lib/routeParam.js";
import { recordRequestActivity } from "../activity/activity.js";

export const paymentRouter = Router();

paymentRouter.use(requireAuth);

paymentRouter.post(
  "/receipts",
  asyncHandler(async (req, res) => {
    const data = createReceiptSchema.parse(req.body);
    const receipt = await paymentService.createReceipt(data);
    recordRequestActivity(req, {
      module: "PAYMENT",
      action: "PAYMENT_RECORDED",
      entityId: receipt.salesInvoice.id,
      entityNo: receipt.salesInvoice.invoiceNo,
      summary: `Recorded ${receipt.mode.toLowerCase()} receipt ${receipt.receiptNo} on invoice ${receipt.salesInvoice.invoiceNo} (${receipt.customer.name})`,
      amount: Number(receipt.amount),
      href: `/sales/${receipt.salesInvoice.id}`,
    });
    res.status(201).json(receipt);
  })
);

paymentRouter.delete(
  "/receipts/:id",
  requireCanDelete,
  asyncHandler(async (req, res) => {
    const receipt = await paymentService.deleteReceipt(routeParam(req.params.id));
    recordRequestActivity(req, {
      module: "PAYMENT",
      action: "PAYMENT_DELETED",
      entityId: receipt.salesInvoice.id,
      entityNo: receipt.salesInvoice.invoiceNo,
      summary: `Deleted receipt ${receipt.receiptNo} on invoice ${receipt.salesInvoice.invoiceNo} (${receipt.customer.name})`,
      amount: Number(receipt.amount),
      href: `/sales/${receipt.salesInvoice.id}`,
    });
    res.status(204).send();
  })
);

paymentRouter.post(
  "/vendor-payments",
  asyncHandler(async (req, res) => {
    const data = createVendorPaymentSchema.parse(req.body);
    const payment = await paymentService.createVendorPayment(data);
    const party = payment.vendor?.name ?? payment.purchaseBill.billNo;
    recordRequestActivity(req, {
      module: "PAYMENT",
      action: "PAYMENT_RECORDED",
      entityId: payment.purchaseBill.id,
      entityNo: payment.purchaseBill.billNo,
      summary: `Recorded ${payment.mode.toLowerCase()} payment ${payment.paymentNo} on purchase bill ${payment.purchaseBill.billNo} (${party})`,
      amount: Number(payment.amount),
      href: `/purchase/${payment.purchaseBill.id}`,
    });
    res.status(201).json(payment);
  })
);

paymentRouter.delete(
  "/vendor-payments/:id",
  requireCanDelete,
  asyncHandler(async (req, res) => {
    const payment = await paymentService.deleteVendorPayment(routeParam(req.params.id));
    const party = payment.vendor?.name ?? payment.purchaseBill.billNo;
    recordRequestActivity(req, {
      module: "PAYMENT",
      action: "PAYMENT_DELETED",
      entityId: payment.purchaseBill.id,
      entityNo: payment.purchaseBill.billNo,
      summary: `Deleted payment ${payment.paymentNo} on purchase bill ${payment.purchaseBill.billNo} (${party})`,
      amount: Number(payment.amount),
      href: `/purchase/${payment.purchaseBill.id}`,
    });
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
