import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth, requireCanDelete } from "../../middleware/auth.js";
import { requireDeletePin } from "../../middleware/requireDeletePin.js";
import { createSalesInvoiceSchema } from "./sales.schema.js";
import * as salesService from "./sales.service.js";
import { routeParam } from "../../lib/routeParam.js";

export const salesRouter = Router();

salesRouter.use(requireAuth);

salesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const invoices = await salesService.listSalesInvoices();
    res.json(invoices);
  })
);

salesRouter.get(
  "/next-invoice-no",
  asyncHandler(async (_req, res) => {
    const invoiceNo = await salesService.previewNextInvoiceNo();
    res.json({ invoiceNo });
  })
);

salesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const invoice = await salesService.getSalesInvoice(routeParam(req.params.id));
    res.json(invoice);
  })
);

salesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSalesInvoiceSchema.parse(req.body);
    const invoice = await salesService.createSalesInvoice(data);
    res.status(201).json(invoice);
  })
);

salesRouter.put(
  "/:id",
  requireDeletePin,
  asyncHandler(async (req, res) => {
    const data = createSalesInvoiceSchema.parse(req.body);
    const invoice = await salesService.updateSalesInvoice(routeParam(req.params.id), data);
    res.json(invoice);
  })
);

salesRouter.delete(
  "/:id/permanent",
  requireCanDelete,
  requireDeletePin,
  asyncHandler(async (req, res) => {
    await salesService.permanentlyDeleteSalesInvoice(routeParam(req.params.id));
    res.status(204).send();
  })
);

salesRouter.post(
  "/:id/restore",
  requireCanDelete,
  asyncHandler(async (req, res) => {
    await salesService.restoreSalesInvoice(routeParam(req.params.id));
    res.status(204).send();
  })
);

salesRouter.delete(
  "/:id",
  requireCanDelete,
  requireDeletePin,
  asyncHandler(async (req, res) => {
    await salesService.deleteSalesInvoice(routeParam(req.params.id));
    res.status(204).send();
  })
);
