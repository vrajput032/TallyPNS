import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { createSalesInvoiceSchema } from "./sales.schema.js";
import * as salesService from "./sales.service.js";

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
  "/:id",
  asyncHandler(async (req, res) => {
    const invoice = await salesService.getSalesInvoice(req.params.id);
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

salesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await salesService.deleteSalesInvoice(req.params.id);
    res.status(204).send();
  })
);
