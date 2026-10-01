import { Router } from "express";
import multer from "multer";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth, requireCanDelete } from "../../middleware/auth.js";
import { requireDeletePin } from "../../middleware/requireDeletePin.js";
import { ApiError } from "../../middleware/errorHandler.js";
import { assertAllowedAttachment, MAX_ATTACHMENT_BYTES } from "../../lib/storage.js";
import { extractPdfText } from "../../lib/extractPdf.js";
import {
  createPurchaseBillSchema,
  resetRunningCostSchema,
  setRunningCostSchema,
} from "./purchase.schema.js";
import {
  resetRunningCostOverrides,
  setRunningCostOverrides,
} from "../../lib/runningCostOverrides.js";
import * as purchaseService from "./purchase.service.js";
import { parseSupplierInvoiceText } from "./parseSupplierInvoice.js";
import { getMonthlyRunningCosts } from "./runningCosts.js";
import { RUNNING_COST_LINE_LABELS } from "../../lib/manufacturingPnl.js";
import { routeParam } from "../../lib/routeParam.js";
import { recordRequestActivity } from "../activity/activity.js";
import { scheduleSheetsSync } from "../sheets/sheets.sync.js";

export const purchaseRouter = Router();

purchaseRouter.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ATTACHMENT_BYTES },
});

purchaseRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const bills = await purchaseService.listPurchaseBills();
    res.json(bills);
  })
);

purchaseRouter.get(
  "/running-costs",
  asyncHandler(async (_req, res) => {
    res.json(await getMonthlyRunningCosts());
  })
);

purchaseRouter.put(
  "/running-costs/lines",
  requireDeletePin,
  asyncHandler(async (req, res) => {
    const data = setRunningCostSchema.parse(req.body);
    const months = await setRunningCostOverrides(data);
    scheduleSheetsSync("running cost set");
    recordRequestActivity(req, {
      module: "PURCHASE",
      action: "UPDATED",
      entityId: data.lineId,
      summary: `Set ${RUNNING_COST_LINE_LABELS[data.lineId]} to ₹${data.amount} for ${data.fromMonth} → ${data.toMonth}`,
      amount: data.amount,
      href: "/purchase?tab=running_cost",
    });
    res.json({ months });
  })
);

purchaseRouter.post(
  "/running-costs/lines/reset",
  requireDeletePin,
  asyncHandler(async (req, res) => {
    const data = resetRunningCostSchema.parse(req.body);
    const months = await resetRunningCostOverrides(data);
    scheduleSheetsSync("running cost reset");
    recordRequestActivity(req, {
      module: "PURCHASE",
      action: "UPDATED",
      entityId: data.lineId,
      summary: `Reset ${RUNNING_COST_LINE_LABELS[data.lineId]} to default for ${data.fromMonth} → ${data.toMonth}`,
      href: "/purchase?tab=running_cost",
    });
    res.json({ months });
  })
);

purchaseRouter.post(
  "/parse",
  (req, res, next) => {
    upload.single("file")(req as never, res as never, (err: unknown) => {
      if (err instanceof Error) {
        next(new ApiError(400, err.message.includes("File too large") ? "File too large (max 10 MB)" : err.message));
        return;
      }
      next();
    });
  },
  asyncHandler(async (req, res) => {
    const file = req.file;
    const isPdf =
      file?.mimetype === "application/pdf" || file?.originalname.toLowerCase().endsWith(".pdf");
    if (!file?.buffer || !isPdf) {
      throw new ApiError(400, "Upload the supplier bill as a PDF to read its details");
    }
    const text = await extractPdfText(file.buffer);
    res.json({ ...parseSupplierInvoiceText(text), sourceFileName: file.originalname });
  })
);

purchaseRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const bill = await purchaseService.getPurchaseBill(routeParam(req.params.id));
    res.json(bill);
  })
);

purchaseRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createPurchaseBillSchema.parse(req.body);
    const bill = await purchaseService.createPurchaseBill(data);
    const party = bill.vendor?.name?.trim() || bill.title?.trim() || bill.billNo;
    recordRequestActivity(req, {
      module: "PURCHASE",
      action: "CREATED",
      entityId: bill.id,
      entityNo: bill.billNo,
      summary: `Created purchase bill ${bill.billNo} for ${party}`,
      amount: Number(bill.totalAmount),
      href: `/purchase/${bill.id}`,
      notifyDevices: true,
    });
    res.status(201).json(bill);
  })
);

purchaseRouter.put(
  "/:id",
  requireDeletePin,
  asyncHandler(async (req, res) => {
    const data = createPurchaseBillSchema.parse(req.body);
    const bill = await purchaseService.updatePurchaseBill(routeParam(req.params.id), data);
    const party = bill.vendor?.name?.trim() || bill.title?.trim() || bill.billNo;
    recordRequestActivity(req, {
      module: "PURCHASE",
      action: "UPDATED",
      entityId: bill.id,
      entityNo: bill.billNo,
      summary: `Updated purchase bill ${bill.billNo} for ${party}`,
      amount: Number(bill.totalAmount),
      href: `/purchase/${bill.id}`,
      notifyDevices: true,
    });
    res.json(bill);
  })
);

purchaseRouter.post(
  "/:id/attachments",
  (req, res, next) => {
    upload.single("file")(req, res, (err: unknown) => {
      if (err instanceof Error) {
        next(
          new ApiError(
            400,
            err.message.includes("File too large") ? "File too large (max 10 MB)" : err.message
          )
        );
        return;
      }
      next();
    });
  },
  asyncHandler(async (req, res) => {
    const file = req.file;
    if (!file?.buffer) {
      throw new ApiError(400, "Upload a PDF or image file");
    }
    assertAllowedAttachment(file);
    const attachment = await purchaseService.addPurchaseAttachment(
      routeParam(req.params.id),
      file
    );
    res.status(201).json(attachment);
  })
);

purchaseRouter.delete(
  "/:id/attachments/:attachmentId",
  requireCanDelete,
  asyncHandler(async (req, res) => {
    await purchaseService.deletePurchaseAttachment(
      routeParam(req.params.id),
      routeParam(req.params.attachmentId)
    );
    res.status(204).send();
  })
);

purchaseRouter.delete(
  "/:id/permanent",
  requireCanDelete,
  requireDeletePin,
  asyncHandler(async (req, res) => {
    const id = routeParam(req.params.id);
    const bill = await purchaseService.getPurchaseBill(id, { includeDeleted: true });
    await purchaseService.permanentlyDeletePurchaseBill(id);
    recordRequestActivity(req, {
      module: "PURCHASE",
      action: "DELETED",
      entityId: bill.id,
      entityNo: bill.billNo,
      summary: `Permanently deleted purchase bill ${bill.billNo}`,
      amount: Number(bill.totalAmount),
    });
    res.status(204).send();
  })
);

purchaseRouter.post(
  "/:id/restore",
  requireCanDelete,
  asyncHandler(async (req, res) => {
    const id = routeParam(req.params.id);
    await purchaseService.restorePurchaseBill(id);
    const bill = await purchaseService.getPurchaseBill(id);
    const party = bill.vendor?.name?.trim() || bill.title?.trim() || bill.billNo;
    recordRequestActivity(req, {
      module: "PURCHASE",
      action: "RESTORED",
      entityId: bill.id,
      entityNo: bill.billNo,
      summary: `Restored purchase bill ${bill.billNo} for ${party}`,
      amount: Number(bill.totalAmount),
      href: `/purchase/${bill.id}`,
    });
    res.status(204).send();
  })
);

purchaseRouter.delete(
  "/:id",
  requireCanDelete,
  requireDeletePin,
  asyncHandler(async (req, res) => {
    const id = routeParam(req.params.id);
    const bill = await purchaseService.getPurchaseBill(id);
    const party = bill.vendor?.name?.trim() || bill.title?.trim() || bill.billNo;
    await purchaseService.deletePurchaseBill(id);
    recordRequestActivity(req, {
      module: "PURCHASE",
      action: "DELETED",
      entityId: bill.id,
      entityNo: bill.billNo,
      summary: `Deleted purchase bill ${bill.billNo} for ${party}`,
      amount: Number(bill.totalAmount),
    });
    res.status(204).send();
  })
);
