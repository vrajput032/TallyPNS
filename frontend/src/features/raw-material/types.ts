import type { PaymentStatus } from "@/features/payments/types";
import type { YieldRow } from "@/lib/rawMaterialYield";

export interface RawMaterialBillItem {
  id: string;
  description: string;
  hsn: string | null;
  quantityKg: string;
  ratePerKg: string;
  amount: string;
}

export interface RawMaterialPayment {
  id: string;
  paymentNo: string;
  amount: string;
  mode: "CASH" | "BANK";
  reference: string | null;
  paymentDate: string;
  narration: string | null;
}

export interface RawMaterialBill {
  id: string;
  billNo: string;
  supplierName: string;
  supplierGstin: string | null;
  billDate: string;
  vehicleNo: string | null;
  destination: string | null;
  taxableAmount: string;
  cgstAmount: string;
  sgstAmount: string;
  igstAmount: string;
  roundOff: string;
  totalAmount: string;
  totalKg: string;
  notes: string | null;
  sourceFileName: string | null;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: PaymentStatus;
  yield: YieldRow[];
  items: RawMaterialBillItem[];
  payments?: RawMaterialPayment[];
  createdAt: string;
  updatedAt: string;
}

export interface RawMaterialBillItemInput {
  description: string;
  hsn?: string | null;
  quantityKg: number;
  ratePerKg: number;
  amount?: number;
}

export interface RawMaterialBillInput {
  billNo: string;
  supplierName: string;
  supplierGstin?: string | null;
  billDate?: string;
  vehicleNo?: string | null;
  destination?: string | null;
  taxableAmount: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  roundOff?: number;
  totalAmount: number;
  notes?: string | null;
  sourceFileName?: string | null;
  items: RawMaterialBillItemInput[];
}

export interface ParsedRawMaterialBill {
  billNo: string | null;
  supplierName: string | null;
  supplierGstin: string | null;
  billDate: string | null;
  vehicleNo: string | null;
  destination: string | null;
  taxableAmount: number | null;
  cgstAmount: number | null;
  sgstAmount: number | null;
  igstAmount: number | null;
  roundOff: number | null;
  totalAmount: number | null;
  totalKg: number | null;
  items: RawMaterialBillItemInput[];
  warnings: string[];
  sourceFileName?: string;
}

export interface CreateRawMaterialPaymentInput {
  amount: number;
  mode: "CASH" | "BANK";
  reference?: string | null;
  paymentDate?: string;
  narration?: string | null;
}
