export type PaymentMode = "CASH" | "BANK";
export type PaymentStatus = "PENDING" | "PARTIAL" | "PAID";

export interface PaymentReceipt {
  id: string;
  receiptNo: string;
  customerId: string;
  salesInvoiceId: string;
  amount: string;
  mode: PaymentMode;
  reference: string | null;
  receiptDate: string;
  narration: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VendorPayment {
  id: string;
  paymentNo: string;
  vendorId: string;
  purchaseBillId: string;
  amount: string;
  mode: PaymentMode;
  reference: string | null;
  paymentDate: string;
  narration: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReceiptInput {
  salesInvoiceId: string;
  amount: number;
  mode: PaymentMode;
  reference?: string | null;
  receiptDate?: string;
  narration?: string | null;
}

export interface CreateVendorPaymentInput {
  purchaseBillId: string;
  amount: number;
  mode: PaymentMode;
  reference?: string | null;
  paymentDate?: string;
  narration?: string | null;
}

export interface CashBankEntry {
  id: string;
  kind: "IN" | "OUT";
  voucherNo: string;
  date: string;
  party: string;
  against: string;
  amount: number;
  reference: string | null;
  narration: string | null;
  source: "receipt" | "payment";
}

export interface CashBankBook {
  mode: PaymentMode;
  entries: CashBankEntry[];
  totalIn: number;
  totalOut: number;
  closingBalance: number;
}

export interface PartyOutstandingRow {
  id: string;
  name: string;
  openingBalance: number;
  balance: number;
}

export interface PartyOutstanding {
  debtors: PartyOutstandingRow[];
  creditors: PartyOutstandingRow[];
  totalDebtors: number;
  totalCreditors: number;
}
