import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth, requireCanDelete } from "../../middleware/auth.js";
import { requireDeletePin } from "../../middleware/requireDeletePin.js";
import { createSalesInvoiceSchema } from "./sales.schema.js";
import * as salesService from "./sales.service.js";
import { routeParam } from "../../lib/routeParam.js";
import { recordRequestActivity } from "../activity/activity.js";

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
    recordRequestActivity(req, {
      module: "SALES",
      action: "CREATED",
      entityId: invoice.id,
      entityNo: invoice.invoiceNo,
      summary: `Created sales invoice ${invoice.invoiceNo} for ${invoice.customer.name}`,
      amount: Number(invoice.totalAmount),
      href: `/sales/${invoice.id}`,
    });
    res.status(201).json(invoice);
  })
);

salesRouter.put(
  "/:id",
  requireDeletePin,
  asyncHandler(async (req, res) => {
    const data = createSalesInvoiceSchema.parse(req.body);
    const invoice = await salesService.updateSalesInvoice(routeParam(req.params.id), data);
    recordRequestActivity(req, {
      module: "SALES",
      action: "UPDATED",
      entityId: invoice.id,
      entityNo: invoice.invoiceNo,
      summary: `Updated sales invoice ${invoice.invoiceNo} for ${invoice.customer.name}`,
      amount: Number(invoice.totalAmount),
      href: `/sales/${invoice.id}`,
    });
    res.json(invoice);
  })
);

salesRouter.delete(
  "/:id/permanent",
  requireCanDelete,
  requireDeletePin,
  asyncHandler(async (req, res) => {
    const id = routeParam(req.params.id);
    const invoice = await salesService.getSalesInvoice(id, { includeDeleted: true });
    await salesService.permanentlyDeleteSalesInvoice(id);
    recordRequestActivity(req, {
      module: "SALES",
      action: "DELETED",
      entityId: invoice.id,
      entityNo: invoice.invoiceNo,
      summary: `Permanently deleted sales invoice ${invoice.invoiceNo}`,
      amount: Number(invoice.totalAmount),
    });
    res.status(204).send();
  })
);

salesRouter.post(
  "/:id/restore",
  requireCanDelete,
  asyncHandler(async (req, res) => {
    const id = routeParam(req.params.id);
    await salesService.restoreSalesInvoice(id);
    const invoice = await salesService.getSalesInvoice(id);
    recordRequestActivity(req, {
      module: "SALES",
      action: "RESTORED",
      entityId: invoice.id,
      entityNo: invoice.invoiceNo,
      summary: `Restored sales invoice ${invoice.invoiceNo} for ${invoice.customer.name}`,
      amount: Number(invoice.totalAmount),
      href: `/sales/${invoice.id}`,
    });
    res.status(204).send();
  })
);

salesRouter.delete(
  "/:id",
  requireCanDelete,
  requireDeletePin,
  asyncHandler(async (req, res) => {
    const id = routeParam(req.params.id);
    const invoice = await salesService.getSalesInvoice(id);
    await salesService.deleteSalesInvoice(id);
    recordRequestActivity(req, {
      module: "SALES",
      action: "DELETED",
      entityId: invoice.id,
      entityNo: invoice.invoiceNo,
      summary: `Deleted sales invoice ${invoice.invoiceNo} for ${invoice.customer.name}`,
      amount: Number(invoice.totalAmount),
    });
    res.status(204).send();
  })
);
