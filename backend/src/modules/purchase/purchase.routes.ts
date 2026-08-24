import { Router } from "express";
import multer from "multer";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth, requireCanDelete } from "../../middleware/auth.js";
import { requireDeletePin } from "../../middleware/requireDeletePin.js";
import { ApiError } from "../../middleware/errorHandler.js";
import { assertAllowedAttachment, MAX_ATTACHMENT_BYTES } from "../../lib/storage.js";
import { createPurchaseBillSchema } from "./purchase.schema.js";
import * as purchaseService from "./purchase.service.js";
import { routeParam } from "../../lib/routeParam.js";

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
    res.status(201).json(bill);
  })
);

purchaseRouter.put(
  "/:id",
  requireDeletePin,
  asyncHandler(async (req, res) => {
    const data = createPurchaseBillSchema.parse(req.body);
    const bill = await purchaseService.updatePurchaseBill(routeParam(req.params.id), data);
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
    await purchaseService.permanentlyDeletePurchaseBill(routeParam(req.params.id));
    res.status(204).send();
  })
);

purchaseRouter.post(
  "/:id/restore",
  requireCanDelete,
  asyncHandler(async (req, res) => {
    await purchaseService.restorePurchaseBill(routeParam(req.params.id));
    res.status(204).send();
  })
);

purchaseRouter.delete(
  "/:id",
  requireCanDelete,
  requireDeletePin,
  asyncHandler(async (req, res) => {
    await purchaseService.deletePurchaseBill(routeParam(req.params.id));
    res.status(204).send();
  })
);
