export type LedgerEntryKind = "OPENING" | "INVOICE" | "RECEIPT" | "BILL" | "PAYMENT";
export type LedgerPaymentMode = "CASH" | "BANK";

export interface LedgerCustomerSummary {
  id: string;
  name: string;
  phone: string | null;
  gstin: string | null;
  openingBalance: number;
  totalBilled: number;
  totalPaid: number;
  closingBalance: number;
  entryCount: number;
  lastTransactionDate: string | null;
}

export interface LedgerList {
  customers: LedgerCustomerSummary[];
  totalBilled: number;
  totalPaid: number;
  totalClosingBalance: number;
}

export interface LedgerSupplierSummary {
  key: string;
  name: string;
  gstin: string | null;
  billCount: number;
  totalBilled: number;
  totalPaid: number;
  /** Debit minus credit: negative means we still owe the supplier. */
  closingBalance: number;
  entryCount: number;
  lastTransactionDate: string | null;
}

export interface SupplierLedgerList {
  suppliers: LedgerSupplierSummary[];
  totalBilled: number;
  totalPaid: number;
  totalClosingBalance: number;
}

export interface LedgerCustomer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  address: string | null;
}

export interface LedgerSupplier {
  key: string;
  name: string;
  gstin: string | null;
  aliases: string[];
}

export interface LedgerAllocation {
  documentId: string;
  documentNo: string;
  voucherNo: string;
  amount: number;
}

export interface LedgerEntry {
  id: string;
  date: string | null;
  kind: LedgerEntryKind;
  voucherNo: string;
  particulars: string;
  debit: number;
  credit: number;
  balance: number;
  /** Invoice or bill to open; null when one payment covered several bills. */
  documentId: string | null;
  paymentMode: LedgerPaymentMode | null;
  reference: string | null;
  allocations: LedgerAllocation[];
}

export interface LedgerBook {
  openingBalance: number;
  entries: LedgerEntry[];
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
}

export interface CustomerLedger extends LedgerBook {
  customer: LedgerCustomer;
}

export interface SupplierLedger extends LedgerBook {
  supplier: LedgerSupplier;
}
