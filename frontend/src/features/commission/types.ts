import type { PaymentMode } from "@/features/payments/types";
import type { CommissionType } from "./commission";

export interface CommissionCustomerRow {
  id: string;
  name: string;
  commissionType: CommissionType | null;
  commissionRate: number | null;
  billCount: number;
  billCommission: number;
  lumpSum: number;
  earned: number;
  paid: number;
  /** All-time earned − paid */
  due: number;
}

export interface CommissionSummary {
  month: string | null;
  customers: CommissionCustomerRow[];
  totals: { earned: number; paid: number; due: number };
}

export type CommissionStatementKind = "BILL" | "LUMP_SUM" | "PAYMENT";

export interface CommissionStatementRow {
  id: string;
  kind: CommissionStatementKind;
  date: string;
  ref: string;
  description: string;
  earned: number;
  paid: number;
  balance: number;
  href: string | null;
  mode: PaymentMode | null;
  month: string | null;
  note: string | null;
}

export interface CommissionStatement {
  customer: {
    id: string;
    name: string;
    phone: string | null;
    commissionType: CommissionType | null;
    commissionRate: number | null;
  };
  rows: CommissionStatementRow[];
  totals: { earned: number; paid: number; due: number };
}

export interface CommissionEntryInput {
  customerId: string;
  month: string;
  amount: number;
  note?: string | null;
}

export interface CommissionPaymentInput {
  customerId: string;
  amount: number;
  mode: PaymentMode;
  reference?: string | null;
  paymentDate?: string;
  narration?: string | null;
}
