import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth, requireCanDelete } from "../../middleware/auth.js";
import { routeParam } from "../../lib/routeParam.js";
import { monthLabel } from "../../lib/manufacturingPnl.js";
import { recordRequestActivity } from "../activity/activity.js";
import {
  commissionEntrySchema,
  commissionPaymentSchema,
  yearMonthSchema,
} from "./commission.schema.js";
import * as commissionService from "./commission.service.js";

export const commissionRouter = Router();

commissionRouter.use(requireAuth);

function entryMonthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return monthLabel(year, monthNumber);
}

commissionRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const month = typeof req.query.month === "string" && req.query.month
      ? yearMonthSchema.parse(req.query.month)
      : undefined;
    res.json(await commissionService.getCommissionSummary(month));
  })
);

commissionRouter.get(
  "/customers/:id",
  asyncHandler(async (req, res) => {
    res.json(await commissionService.getCustomerCommissionStatement(routeParam(req.params.id)));
  })
);

commissionRouter.post(
  "/entries",
  asyncHandler(async (req, res) => {
    const data = commissionEntrySchema.parse(req.body);
    const entry = await commissionService.createCommissionEntry(data);
    recordRequestActivity(req, {
      module: "SALES",
      action: "CREATED",
      entityId: entry.id,
      summary: `Added lump-sum commission for ${entry.customer.name} (${entryMonthLabel(entry.month)})`,
      amount: Number(entry.amount),
      href: `/commission/${entry.customerId}`,
    });
    res.status(201).json(entry);
  })
);

commissionRouter.put(
  "/entries/:id",
  asyncHandler(async (req, res) => {
    const data = commissionEntrySchema.parse(req.body);
    const entry = await commissionService.updateCommissionEntry(routeParam(req.params.id), data);
    recordRequestActivity(req, {
      module: "SALES",
      action: "UPDATED",
      entityId: entry.id,
      summary: `Updated lump-sum commission for ${entry.customer.name} (${entryMonthLabel(entry.month)})`,
      amount: Number(entry.amount),
      href: `/commission/${entry.customerId}`,
    });
    res.json(entry);
  })
);

commissionRouter.delete(
  "/entries/:id",
  requireCanDelete,
  asyncHandler(async (req, res) => {
    const entry = await commissionService.deleteCommissionEntry(routeParam(req.params.id));
    recordRequestActivity(req, {
      module: "SALES",
      action: "DELETED",
      entityId: entry.id,
      summary: `Deleted lump-sum commission for ${entry.customer.name} (${entryMonthLabel(entry.month)})`,
      amount: Number(entry.amount),
      href: `/commission/${entry.customerId}`,
    });
    res.status(204).send();
  })
);

commissionRouter.post(
  "/payments",
  asyncHandler(async (req, res) => {
    const data = commissionPaymentSchema.parse(req.body);
    const payment = await commissionService.createCommissionPayment(data);
    recordRequestActivity(req, {
      module: "PAYMENT",
      action: "PAYMENT_RECORDED",
      entityId: payment.id,
      entityNo: payment.paymentNo,
      summary: `Paid ${payment.mode.toLowerCase()} commission ${payment.paymentNo} to ${payment.customer.name}`,
      amount: Number(payment.amount),
      href: `/commission/${payment.customerId}`,
    });
    res.status(201).json(payment);
  })
);

commissionRouter.delete(
  "/payments/:id",
  requireCanDelete,
  asyncHandler(async (req, res) => {
    const payment = await commissionService.deleteCommissionPayment(routeParam(req.params.id));
    recordRequestActivity(req, {
      module: "PAYMENT",
      action: "PAYMENT_DELETED",
      entityId: payment.id,
      entityNo: payment.paymentNo,
      summary: `Deleted commission payment ${payment.paymentNo} to ${payment.customer.name}`,
      amount: Number(payment.amount),
      href: `/commission/${payment.customerId}`,
    });
    res.status(204).send();
  })
);
