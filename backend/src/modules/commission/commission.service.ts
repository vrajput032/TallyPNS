import type { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { activeOnly } from "../../lib/activeRecords.js";
import { monthKey, monthLabel, round2 } from "../../lib/manufacturingPnl.js";
import { ApiError } from "../../middleware/errorHandler.js";
import { scheduleSheetsSync } from "../sheets/sheets.sync.js";
import type { commissionEntrySchema, commissionPaymentSchema } from "./commission.schema.js";

const PAYMENT_PREFIX = "COM-";
const PAYMENT_START = 10001;

function utcMonthKey(date: Date) {
  return monthKey(date.getUTCFullYear(), date.getUTCMonth() + 1);
}

function monthStart(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
}

async function loadCommissionData(customerId?: string) {
  const byCustomer = customerId ? { customerId } : {};
  const [invoices, entries, payments] = await Promise.all([
    prisma.salesInvoice.findMany({
      where: { ...activeOnly, ...byCustomer, isTrading: false, commissionAmount: { gt: 0 } },
      select: {
        id: true,
        customerId: true,
        invoiceNo: true,
        invoiceDate: true,
        commissionAmount: true,
        items: { select: { productId: true, quantity: true } },
      },
    }),
    prisma.commissionEntry.findMany({ where: byCustomer }),
    prisma.commissionPayment.findMany({ where: byCustomer }),
  ]);
  return { invoices, entries, payments };
}

export type CommissionCustomerRow = {
  id: string;
  name: string;
  commissionType: string | null;
  commissionRate: number | null;
  billCount: number;
  billCommission: number;
  lumpSum: number;
  earned: number;
  paid: number;
  /** All-time earned − paid (not limited by the month filter) */
  due: number;
};

/** Per-customer commission. `month` (YYYY-MM) limits earned / paid to that month; due is always all-time. */
export async function getCommissionSummary(month?: string) {
  const [customers, { invoices, entries, payments }] = await Promise.all([
    prisma.customer.findMany({
      select: { id: true, name: true, commissionType: true, commissionRate: true },
      orderBy: { name: "asc" },
    }),
    loadCommissionData(),
  ]);

  const rows = new Map<string, CommissionCustomerRow & { allEarned: number; allPaid: number }>();
  for (const customer of customers) {
    rows.set(customer.id, {
      id: customer.id,
      name: customer.name,
      commissionType: customer.commissionType,
      commissionRate: customer.commissionRate == null ? null : Number(customer.commissionRate),
      billCount: 0,
      billCommission: 0,
      lumpSum: 0,
      earned: 0,
      paid: 0,
      due: 0,
      allEarned: 0,
      allPaid: 0,
    });
  }
  const inMonth = (key: string) => !month || key === month;

  for (const invoice of invoices) {
    const row = rows.get(invoice.customerId);
    if (!row) continue;
    const amount = Number(invoice.commissionAmount);
    row.allEarned += amount;
    if (inMonth(utcMonthKey(invoice.invoiceDate))) {
      row.billCount += 1;
      row.billCommission += amount;
    }
  }
  for (const entry of entries) {
    const row = rows.get(entry.customerId);
    if (!row) continue;
    const amount = Number(entry.amount);
    row.allEarned += amount;
    if (inMonth(entry.month)) row.lumpSum += amount;
  }
  for (const payment of payments) {
    const row = rows.get(payment.customerId);
    if (!row) continue;
    const amount = Number(payment.amount);
    row.allPaid += amount;
    if (inMonth(utcMonthKey(payment.paymentDate))) row.paid += amount;
  }

  const result: CommissionCustomerRow[] = [...rows.values()]
    .filter((row) => row.commissionType || row.allEarned > 0 || row.allPaid > 0)
    .map(({ allEarned, allPaid, ...row }) => ({
      ...row,
      billCommission: round2(row.billCommission),
      lumpSum: round2(row.lumpSum),
      earned: round2(row.billCommission + row.lumpSum),
      paid: round2(row.paid),
      due: round2(allEarned - allPaid),
    }));

  const sum = (pick: (row: CommissionCustomerRow) => number) =>
    round2(result.reduce((total, row) => total + pick(row), 0));

  return {
    month: month ?? null,
    customers: result,
    totals: { earned: sum((r) => r.earned), paid: sum((r) => r.paid), due: sum((r) => r.due) },
  };
}

export type CommissionStatementRow = {
  id: string;
  kind: "BILL" | "LUMP_SUM" | "PAYMENT";
  date: Date;
  ref: string;
  description: string;
  earned: number;
  paid: number;
  balance: number;
  href: string | null;
  mode: "CASH" | "BANK" | null;
  month: string | null;
  note: string | null;
};

/** Everything earned and paid for one customer, oldest first, with running balance. */
export async function getCustomerCommissionStatement(customerId: string) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, name: true, phone: true, commissionType: true, commissionRate: true },
  });
  if (!customer) throw new ApiError(404, "Customer not found");
  const { invoices, entries, payments } = await loadCommissionData(customerId);

  const rows: Omit<CommissionStatementRow, "balance">[] = [
    ...invoices.map((invoice) => {
      const pieces = invoice.items
        .filter((item) => item.productId)
        .reduce((sum, item) => sum + Number(item.quantity), 0);
      return {
        id: invoice.id,
        kind: "BILL" as const,
        date: invoice.invoiceDate,
        ref: invoice.invoiceNo,
        description: `Bill · ${pieces.toLocaleString("en-IN")} pcs`,
        earned: round2(Number(invoice.commissionAmount)),
        paid: 0,
        href: `/sales/${invoice.id}`,
        mode: null,
        month: null,
        note: null,
      };
    }),
    ...entries.map((entry) => {
      const [year, monthNumber] = entry.month.split("-").map(Number);
      return {
        id: entry.id,
        kind: "LUMP_SUM" as const,
        date: monthStart(entry.month),
        ref: "Lump sum",
        description: `Lump sum · ${monthLabel(year, monthNumber)}`,
        earned: round2(Number(entry.amount)),
        paid: 0,
        href: null,
        mode: null,
        month: entry.month,
        note: entry.note,
      };
    }),
    ...payments.map((payment) => ({
      id: payment.id,
      kind: "PAYMENT" as const,
      date: payment.paymentDate,
      ref: payment.paymentNo,
      description: `Paid by ${payment.mode === "CASH" ? "cash" : "bank"}${payment.reference ? ` · ${payment.reference}` : ""}`,
      earned: 0,
      paid: round2(Number(payment.amount)),
      href: null,
      mode: payment.mode,
      month: null,
      note: payment.narration,
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime() || a.ref.localeCompare(b.ref));

  let balance = 0;
  const statement: CommissionStatementRow[] = rows.map((row) => {
    balance = round2(balance + row.earned - row.paid);
    return { ...row, balance };
  });
  const earned = round2(statement.reduce((sum, row) => sum + row.earned, 0));
  const paid = round2(statement.reduce((sum, row) => sum + row.paid, 0));

  return {
    customer: {
      ...customer,
      commissionRate: customer.commissionRate == null ? null : Number(customer.commissionRate),
    },
    rows: statement,
    totals: { earned, paid, due: round2(earned - paid) },
  };
}

async function customerDue(customerId: string) {
  const { invoices, entries, payments } = await loadCommissionData(customerId);
  const earned =
    invoices.reduce((sum, invoice) => sum + Number(invoice.commissionAmount), 0) +
    entries.reduce((sum, entry) => sum + Number(entry.amount), 0);
  const paid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  return round2(earned - paid);
}

async function assertCustomer(customerId: string) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true, name: true } });
  if (!customer) throw new ApiError(404, "Customer not found");
  return customer;
}

export async function createCommissionEntry(data: z.infer<typeof commissionEntrySchema>) {
  await assertCustomer(data.customerId);
  const entry = await prisma.commissionEntry.create({
    data: { ...data, note: data.note?.trim() || null },
    include: { customer: { select: { id: true, name: true } } },
  });
  scheduleSheetsSync("commission entry create");
  return entry;
}

export async function updateCommissionEntry(id: string, data: z.infer<typeof commissionEntrySchema>) {
  const existing = await prisma.commissionEntry.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Lump sum not found");
  await assertCustomer(data.customerId);
  const entry = await prisma.commissionEntry.update({
    where: { id },
    data: { ...data, note: data.note?.trim() || null },
    include: { customer: { select: { id: true, name: true } } },
  });
  scheduleSheetsSync("commission entry update");
  return entry;
}

export async function deleteCommissionEntry(id: string) {
  const existing = await prisma.commissionEntry.findUnique({
    where: { id },
    include: { customer: { select: { id: true, name: true } } },
  });
  if (!existing) throw new ApiError(404, "Lump sum not found");
  await prisma.commissionEntry.delete({ where: { id } });
  scheduleSheetsSync("commission entry delete");
  return existing;
}

async function nextPaymentNo() {
  const rows = await prisma.commissionPayment.findMany({
    where: { paymentNo: { startsWith: PAYMENT_PREFIX } },
    select: { paymentNo: true },
  });
  const maxSeq = rows.reduce((max, { paymentNo }) => {
    const seq = Number(paymentNo.slice(PAYMENT_PREFIX.length));
    return Number.isFinite(seq) && seq > max ? seq : max;
  }, PAYMENT_START - 1);
  return `${PAYMENT_PREFIX}${maxSeq + 1}`;
}

export async function createCommissionPayment(data: z.infer<typeof commissionPaymentSchema>) {
  await assertCustomer(data.customerId);
  const due = await customerDue(data.customerId);
  if (data.amount > due + 0.009) {
    throw new ApiError(400, `Amount exceeds commission due (₹${Math.max(due, 0).toFixed(2)})`);
  }
  const payment = await prisma.commissionPayment.create({
    data: {
      paymentNo: await nextPaymentNo(),
      customerId: data.customerId,
      amount: data.amount,
      mode: data.mode,
      reference: data.reference?.trim() || null,
      paymentDate: data.paymentDate ?? new Date(),
      narration: data.narration?.trim() || null,
    },
    include: { customer: { select: { id: true, name: true } } },
  });
  scheduleSheetsSync("commission payment");
  return payment;
}

export async function deleteCommissionPayment(id: string) {
  const payment = await prisma.commissionPayment.findUnique({
    where: { id },
    include: { customer: { select: { id: true, name: true } } },
  });
  if (!payment) throw new ApiError(404, "Commission payment not found");
  await prisma.commissionPayment.delete({ where: { id } });
  scheduleSheetsSync("commission payment delete");
  return payment;
}

/** Commission cost by `YYYY-MM` for Profit & Loss: lump sums only (bill commission is added per invoice). */
export async function loadLumpSumCommissionByMonth(): Promise<Map<string, number>> {
  const entries = await prisma.commissionEntry.findMany({ select: { month: true, amount: true } });
  const byMonth = new Map<string, number>();
  for (const entry of entries) {
    byMonth.set(entry.month, (byMonth.get(entry.month) ?? 0) + Number(entry.amount));
  }
  return byMonth;
}
