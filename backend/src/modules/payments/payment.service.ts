import { prisma } from "../../lib/prisma.js";
import { activeOnly } from "../../lib/activeRecords.js";
import { ApiError } from "../../middleware/errorHandler.js";
import type { createReceiptSchema, createVendorPaymentSchema } from "./payment.schema.js";
import { withBillPaymentSummary, withPaymentSummary } from "./payment.utils.js";
import type { z } from "zod";
import type { PaymentMode } from "@prisma/client";

const RECEIPT_PREFIX = "RCP-";
const RECEIPT_START = 10001;
const PAYMENT_PREFIX = "PAY-";
const PAYMENT_START = 10001;

async function nextDocNo(prefix: string, start: number, field: "receiptNo" | "paymentNo") {
  if (field === "receiptNo") {
    const rows = await prisma.paymentReceipt.findMany({
      where: { receiptNo: { startsWith: prefix } },
      select: { receiptNo: true },
    });
    const maxSeq = rows.reduce((max, { receiptNo }) => {
      const seq = Number(receiptNo.slice(prefix.length));
      return Number.isFinite(seq) && seq > max ? seq : max;
    }, start - 1);
    return `${prefix}${maxSeq + 1}`;
  }

  const rows = await prisma.vendorPayment.findMany({
    where: { paymentNo: { startsWith: prefix } },
    select: { paymentNo: true },
  });
  const maxSeq = rows.reduce((max, { paymentNo }) => {
    const seq = Number(paymentNo.slice(prefix.length));
    return Number.isFinite(seq) && seq > max ? seq : max;
  }, start - 1);
  return `${prefix}${maxSeq + 1}`;
}

export async function createReceipt(data: z.infer<typeof createReceiptSchema>) {
  const invoice = await prisma.salesInvoice.findUnique({
    where: { id: data.salesInvoiceId },
    include: { receipts: true, customer: true },
  });
  if (!invoice) throw new ApiError(404, "Sales invoice not found");
  if (invoice.deletedAt) throw new ApiError(400, "Cannot record receipt for a deleted invoice");

  const summary = withPaymentSummary(invoice);
  if (summary.paymentStatus === "PAID") {
    throw new ApiError(400, "Invoice is already fully paid");
  }
  if (data.amount > summary.balanceAmount + 0.009) {
    throw new ApiError(
      400,
      `Amount exceeds balance due (₹${summary.balanceAmount.toFixed(2)})`
    );
  }

  const receiptNo = await nextDocNo(RECEIPT_PREFIX, RECEIPT_START, "receiptNo");

  return prisma.paymentReceipt.create({
    data: {
      receiptNo,
      customerId: invoice.customerId,
      salesInvoiceId: invoice.id,
      amount: data.amount,
      mode: data.mode,
      reference: data.reference?.trim() || null,
      receiptDate: data.receiptDate ?? new Date(),
      narration: data.narration?.trim() || null,
    },
    include: {
      customer: true,
      salesInvoice: { select: { id: true, invoiceNo: true, totalAmount: true } },
    },
  });
}

export async function deleteReceipt(id: string) {
  const receipt = await prisma.paymentReceipt.findUnique({ where: { id } });
  if (!receipt) throw new ApiError(404, "Receipt not found");
  await prisma.paymentReceipt.delete({ where: { id } });
}

export async function createVendorPayment(data: z.infer<typeof createVendorPaymentSchema>) {
  const bill = await prisma.purchaseBill.findUnique({
    where: { id: data.purchaseBillId },
    include: { payments: true, vendor: true },
  });
  if (!bill) throw new ApiError(404, "Purchase bill not found");
  if (bill.deletedAt) throw new ApiError(400, "Cannot record payment for a deleted bill");

  const summary = withBillPaymentSummary(bill);
  if (summary.paymentStatus === "PAID") {
    throw new ApiError(400, "Bill is already fully paid");
  }
  if (data.amount > summary.balanceAmount + 0.009) {
    throw new ApiError(
      400,
      `Amount exceeds balance due (₹${summary.balanceAmount.toFixed(2)})`
    );
  }

  const paymentNo = await nextDocNo(PAYMENT_PREFIX, PAYMENT_START, "paymentNo");

  return prisma.vendorPayment.create({
    data: {
      paymentNo,
      vendorId: bill.vendorId,
      purchaseBillId: bill.id,
      amount: data.amount,
      mode: data.mode,
      reference: data.reference?.trim() || null,
      paymentDate: data.paymentDate ?? new Date(),
      narration: data.narration?.trim() || null,
    },
    include: {
      vendor: true,
      purchaseBill: { select: { id: true, billNo: true, totalAmount: true } },
    },
  });
}

export async function deleteVendorPayment(id: string) {
  const payment = await prisma.vendorPayment.findUnique({ where: { id } });
  if (!payment) throw new ApiError(404, "Payment not found");
  await prisma.vendorPayment.delete({ where: { id } });
}

export async function listCashBankBook(mode: PaymentMode) {
  const [receipts, payments] = await Promise.all([
    prisma.paymentReceipt.findMany({
      where: { mode },
      include: {
        customer: { select: { id: true, name: true } },
        salesInvoice: { select: { id: true, invoiceNo: true } },
      },
      orderBy: { receiptDate: "desc" },
    }),
    prisma.vendorPayment.findMany({
      where: { mode },
      include: {
        vendor: { select: { id: true, name: true } },
        purchaseBill: { select: { id: true, billNo: true } },
      },
      orderBy: { paymentDate: "desc" },
    }),
  ]);

  const entries = [
    ...receipts.map((r) => ({
      id: r.id,
      kind: "IN" as const,
      voucherNo: r.receiptNo,
      date: r.receiptDate,
      party: r.customer.name,
      against: r.salesInvoice.invoiceNo,
      amount: Number(r.amount),
      reference: r.reference,
      narration: r.narration,
      source: "receipt" as const,
    })),
    ...payments.map((p) => ({
      id: p.id,
      kind: "OUT" as const,
      voucherNo: p.paymentNo,
      date: p.paymentDate,
      party: p.vendor.name,
      against: p.purchaseBill.billNo,
      amount: Number(p.amount),
      reference: p.reference,
      narration: p.narration,
      source: "payment" as const,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalIn = entries.filter((e) => e.kind === "IN").reduce((s, e) => s + e.amount, 0);
  const totalOut = entries.filter((e) => e.kind === "OUT").reduce((s, e) => s + e.amount, 0);

  return {
    mode,
    entries,
    totalIn,
    totalOut,
    closingBalance: totalIn - totalOut,
  };
}

export async function getPartyOutstanding() {
  const [customers, vendors] = await Promise.all([
    prisma.customer.findMany({
      include: {
        salesInvoices: { where: activeOnly, include: { receipts: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.vendor.findMany({
      include: {
        purchaseBills: { where: activeOnly, include: { payments: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const debtors = customers
    .map((c) => {
      const invoiceBalance = c.salesInvoices.reduce((sum, inv) => {
        const s = withPaymentSummary(inv);
        return sum + s.balanceAmount;
      }, 0);
      const balance = Number(c.openingBalance) + invoiceBalance;
      return {
        id: c.id,
        name: c.name,
        openingBalance: Number(c.openingBalance),
        balance: Math.round(balance * 100) / 100,
      };
    })
    .filter((r) => Math.abs(r.balance) > 0.009);

  const creditors = vendors
    .map((v) => {
      const billBalance = v.purchaseBills.reduce((sum, bill) => {
        const s = withBillPaymentSummary(bill);
        return sum + s.balanceAmount;
      }, 0);
      const balance = Number(v.openingBalance) + billBalance;
      return {
        id: v.id,
        name: v.name,
        openingBalance: Number(v.openingBalance),
        balance: Math.round(balance * 100) / 100,
      };
    })
    .filter((r) => Math.abs(r.balance) > 0.009);

  return {
    debtors,
    creditors,
    totalDebtors: debtors.reduce((s, d) => s + d.balance, 0),
    totalCreditors: creditors.reduce((s, c) => s + c.balance, 0),
  };
}
