import { Router } from "express";
import multer from "multer";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth, requireCanDelete } from "../../middleware/auth.js";
import { requireDeletePin } from "../../middleware/requireDeletePin.js";
import { ApiError } from "../../middleware/errorHandler.js";
import { extractPdfText } from "./extractPdf.js";
import { parseRawMaterialInvoiceText } from "./parseInvoice.js";
import {
  createRawMaterialBillSchema,
  createRawMaterialPaymentSchema,
} from "./raw-material.schema.js";
import * as rawMaterialService from "./raw-material.service.js";

export const rawMaterialRouter = Router();

rawMaterialRouter.use(requireAuth);

function routeParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

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
    res.status(201).json(bill);
  })
);

rawMaterialRouter.put(
  "/:id",
  requireDeletePin,
  asyncHandler(async (req, res) => {
    const data = createRawMaterialBillSchema.parse(req.body);
    const bill = await rawMaterialService.updateRawMaterialBill(routeParam(req.params.id), data);
    res.json(bill);
  })
);

rawMaterialRouter.delete(
  "/:id",
  requireCanDelete,
  requireDeletePin,
  asyncHandler(async (req, res) => {
    await rawMaterialService.deleteRawMaterialBill(routeParam(req.params.id));
    res.status(204).send();
  })
);

rawMaterialRouter.post(
  "/:id/payments",
  asyncHandler(async (req, res) => {
    const data = createRawMaterialPaymentSchema.parse(req.body);
    const bill = await rawMaterialService.createRawMaterialPayment(routeParam(req.params.id), data);
    res.status(201).json(bill);
  })
);

rawMaterialRouter.delete(
  "/payments/:paymentId",
  requireCanDelete,
  asyncHandler(async (req, res) => {
    const bill = await rawMaterialService.deleteRawMaterialPayment(routeParam(req.params.paymentId));
    res.json(bill);
  })
);
