export type LedgerEntryKind = "OPENING" | "INVOICE" | "RECEIPT";

export type LedgerSourceInvoice = {
  id: string;
  invoiceNo: string;
  invoiceDate: Date;
  totalAmount: number;
};

export type LedgerSourceReceipt = {
  id: string;
  receiptNo: string;
  receiptDate: Date;
  amount: number;
  mode: "CASH" | "BANK";
  salesInvoiceId: string;
  invoiceNo: string;
  narration: string | null;
};

export type CustomerLedgerEntry = {
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
  paymentMode: "CASH" | "BANK" | null;
};

export type CustomerLedgerBook = {
  openingBalance: number;
  entries: CustomerLedgerEntry[];
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
};

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function paymentModeLabel(mode: "CASH" | "BANK") {
  switch (mode) {
    case "CASH":
      return "Cash";
    case "BANK":
      return "Bank";
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

export function buildCustomerLedger(input: {
  openingBalance: number;
  invoices: LedgerSourceInvoice[];
  receipts: LedgerSourceReceipt[];
}): CustomerLedgerBook {
  type Draft = Omit<CustomerLedgerEntry, "balance" | "date"> & {
    date: Date | null;
    sort: number;
  };

  const drafts: Draft[] = [];
  const openingBalance = roundMoney(input.openingBalance);

  if (Math.abs(openingBalance) > 0.009) {
    drafts.push({
      id: "opening",
      date: null,
      kind: "OPENING",
      voucherNo: "",
      particulars: "Opening Balance",
      debit: openingBalance > 0 ? openingBalance : 0,
      credit: openingBalance < 0 ? roundMoney(-openingBalance) : 0,
      salesInvoiceId: null,
      receiptId: null,
      paymentMode: null,
      sort: 0,
    });
  }

  for (const invoice of input.invoices) {
    const amount = roundMoney(invoice.totalAmount);
    drafts.push({
      id: invoice.id,
      date: invoice.invoiceDate,
      kind: "INVOICE",
      voucherNo: invoice.invoiceNo,
      particulars: `Sales invoice ${invoice.invoiceNo}`,
      debit: amount,
      credit: 0,
      salesInvoiceId: invoice.id,
      receiptId: null,
      paymentMode: null,
      sort: 1,
    });
  }

  for (const receipt of input.receipts) {
    const amount = roundMoney(receipt.amount);
    const against = receipt.invoiceNo ? ` against ${receipt.invoiceNo}` : "";
    const particulars = receipt.narration?.trim()
      ? receipt.narration.trim()
      : `Receipt (${paymentModeLabel(receipt.mode)})${against}`;
    drafts.push({
      id: receipt.id,
      date: receipt.receiptDate,
      kind: "RECEIPT",
      voucherNo: receipt.receiptNo,
      particulars,
      debit: 0,
      credit: amount,
      salesInvoiceId: receipt.salesInvoiceId,
      receiptId: receipt.id,
      paymentMode: receipt.mode,
      sort: 2,
    });
  }

  drafts.sort((a, b) => {
    const aTime = a.date?.getTime() ?? 0;
    const bTime = b.date?.getTime() ?? 0;
    if (aTime !== bTime) return aTime - bTime;
    if (a.sort !== b.sort) return a.sort - b.sort;
    return a.voucherNo.localeCompare(b.voucherNo);
  });

  let running = 0;
  const entries = drafts.map(({ sort: _sort, date, ...entry }) => {
    running = roundMoney(running + entry.debit - entry.credit);
    return {
      ...entry,
      date: date ? date.toISOString() : null,
      balance: running,
    };
  });

  const totalDebit = roundMoney(entries.reduce((sum, entry) => sum + entry.debit, 0));
  const totalCredit = roundMoney(entries.reduce((sum, entry) => sum + entry.credit, 0));

  return {
    openingBalance,
    entries,
    totalDebit,
    totalCredit,
    closingBalance: roundMoney(totalDebit - totalCredit),
  };
}
