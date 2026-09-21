import { Router } from "express";
import multer from "multer";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth, requireCanDelete } from "../../middleware/auth.js";
import { requireDeletePin } from "../../middleware/requireDeletePin.js";
import { ApiError } from "../../middleware/errorHandler.js";
import { routeParam } from "../../lib/routeParam.js";
import { extractPdfText } from "./extractPdf.js";
import { parseRawMaterialInvoiceText } from "./parseInvoice.js";
import {
  createRawMaterialBillSchema,
  createRawMaterialPaymentSchema,
} from "./raw-material.schema.js";
import * as rawMaterialService from "./raw-material.service.js";
import { recordRequestActivity } from "../activity/activity.js";

export const rawMaterialRouter = Router();

rawMaterialRouter.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isPdf =
      file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf");
    if (isPdf) {
      cb(null, true);
      return;
    }
    cb(new Error("Only PDF bills are supported"));
  },
});

rawMaterialRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const bills = await rawMaterialService.listRawMaterialBills();
    res.json(bills);
  })
);

rawMaterialRouter.post(
  "/parse",
  (req, res, next) => {
    upload.single("file")(req as never, res as never, (err: unknown) => {
      if (err instanceof Error) {
        next(new ApiError(400, err.message));
        return;
      }
      next();
    });
  },
  asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file?.buffer) {
      throw new ApiError(400, "Upload a PDF bill");
    }
    const text = await extractPdfText(file.buffer);
    const parsed = parseRawMaterialInvoiceText(text);
    res.json({
      ...parsed,
      sourceFileName: file.originalname,
    });
  })
);

rawMaterialRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const bill = await rawMaterialService.getRawMaterialBill(routeParam(req.params.id));
    res.json(bill);
  })
);

rawMaterialRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createRawMaterialBillSchema.parse(req.body);
    const bill = await rawMaterialService.createRawMaterialBill(data);
    recordRequestActivity(req, {
      module: "RAW_MATERIAL",
      action: "CREATED",
      entityId: bill.id,
      entityNo: bill.billNo,
      summary: `Created raw material bill ${bill.billNo} from ${bill.supplierName}`,
      amount: Number(bill.totalAmount),
      href: `/raw-material/${bill.id}`,
    });
    res.status(201).json(bill);
  })
);

rawMaterialRouter.put(
  "/:id",
  requireDeletePin,
  asyncHandler(async (req, res) => {
    const data = createRawMaterialBillSchema.parse(req.body);
    const bill = await rawMaterialService.updateRawMaterialBill(routeParam(req.params.id), data);
    recordRequestActivity(req, {
      module: "RAW_MATERIAL",
      action: "UPDATED",
      entityId: bill.id,
      entityNo: bill.billNo,
      summary: `Updated raw material bill ${bill.billNo} from ${bill.supplierName}`,
      amount: Number(bill.totalAmount),
      href: `/raw-material/${bill.id}`,
    });
    res.json(bill);
  })
);

rawMaterialRouter.delete(
  "/:id",
  requireCanDelete,
  requireDeletePin,
  asyncHandler(async (req, res) => {
    const id = routeParam(req.params.id);
    const bill = await rawMaterialService.getRawMaterialBill(id);
    await rawMaterialService.deleteRawMaterialBill(id);
    recordRequestActivity(req, {
      module: "RAW_MATERIAL",
      action: "DELETED",
      entityId: bill.id,
      entityNo: bill.billNo,
      summary: `Deleted raw material bill ${bill.billNo} from ${bill.supplierName}`,
      amount: Number(bill.totalAmount),
    });
    res.status(204).send();
  })
);

rawMaterialRouter.post(
  "/:id/payments",
  asyncHandler(async (req, res) => {
    const data = createRawMaterialPaymentSchema.parse(req.body);
    const bill = await rawMaterialService.createRawMaterialPayment(routeParam(req.params.id), data);
    recordRequestActivity(req, {
      module: "PAYMENT",
      action: "PAYMENT_RECORDED",
      entityId: bill.id,
      entityNo: bill.billNo,
      summary: `Recorded ${data.mode.toLowerCase()} payment on raw material bill ${bill.billNo} (${bill.supplierName})`,
      amount: data.amount,
      href: `/raw-material/${bill.id}`,
    });
    res.status(201).json(bill);
  })
);

rawMaterialRouter.put(
  "/payments/:paymentId",
  asyncHandler(async (req, res) => {
    const data = createRawMaterialPaymentSchema.parse(req.body);
    const bill = await rawMaterialService.updateRawMaterialPayment(
      routeParam(req.params.paymentId),
      data
    );
    recordRequestActivity(req, {
      module: "PAYMENT",
      action: "PAYMENT_UPDATED",
      entityId: bill.id,
      entityNo: bill.billNo,
      summary: `Updated payment on raw material bill ${bill.billNo} (${bill.supplierName})`,
      amount: data.amount,
      href: `/raw-material/${bill.id}`,
    });
    res.json(bill);
  })
);

rawMaterialRouter.delete(
  "/payments/:paymentId",
  asyncHandler(async (req, res) => {
    const { bill, payment } = await rawMaterialService.deleteRawMaterialPayment(
      routeParam(req.params.paymentId)
    );
    recordRequestActivity(req, {
      module: "PAYMENT",
      action: "PAYMENT_DELETED",
      entityId: bill.id,
      entityNo: bill.billNo,
      summary: `Deleted payment ${payment.paymentNo} on raw material bill ${bill.billNo} (${bill.supplierName})`,
      amount: Number(payment.amount),
      href: `/raw-material/${bill.id}`,
    });
    res.json(bill);
  })
);
