export type LedgerEntryKind = "OPENING" | "INVOICE" | "RECEIPT";
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

export interface LedgerCustomer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  address: string | null;
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
  salesInvoiceId: string | null;
  receiptId: string | null;
  paymentMode: LedgerPaymentMode | null;
}

export interface CustomerLedger {
  customer: LedgerCustomer;
  openingBalance: number;
  entries: LedgerEntry[];
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
}
