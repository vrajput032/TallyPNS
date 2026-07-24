import type { PaymentMode } from "@prisma/client";

export type PaymentStatus = "PENDING" | "PARTIAL" | "PAID";

export function paymentStatus(totalAmount: number, paidAmount: number): PaymentStatus {
  if (paidAmount <= 0.009) return "PENDING";
  if (paidAmount + 0.009 >= totalAmount) return "PAID";
  return "PARTIAL";
}

export function withPaymentSummary<
  T extends { totalAmount: { toString(): string } | number | string; receipts?: { amount: unknown }[] },
>(invoice: T) {
  const totalAmount = Number(invoice.totalAmount);
  const paidAmount = (invoice.receipts ?? []).reduce((sum, r) => sum + Number(r.amount), 0);
  const balanceAmount = Math.max(0, Math.round((totalAmount - paidAmount) * 100) / 100);
  return {
    ...invoice,
    paidAmount,
    balanceAmount,
    paymentStatus: paymentStatus(totalAmount, paidAmount),
  };
}

export function withBillPaymentSummary<
  T extends { totalAmount: { toString(): string } | number | string; payments?: { amount: unknown }[] },
>(bill: T) {
  const totalAmount = Number(bill.totalAmount);
  const paidAmount = (bill.payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
  const balanceAmount = Math.max(0, Math.round((totalAmount - paidAmount) * 100) / 100);
  return {
    ...bill,
    paidAmount,
    balanceAmount,
    paymentStatus: paymentStatus(totalAmount, paidAmount),
  };
}

export function isPaymentMode(value: string): value is PaymentMode {
  return value === "CASH" || value === "BANK";
}
