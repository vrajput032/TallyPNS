export type LedgerEntryKind = "OPENING" | "INVOICE" | "RECEIPT" | "BILL" | "PAYMENT";
export type LedgerPaymentMode = "CASH" | "BANK";

/** Which side of the books the party is on: customers owe us, suppliers are owed by us. */
export type LedgerParty = "CUSTOMER" | "SUPPLIER";

export type LedgerSourceDocument = {
  id: string;
  docNo: string;
  date: Date;
  amount: number;
};

export type LedgerSourcePayment = {
  id: string;
  voucherNo: string;
  date: Date;
  amount: number;
  mode: LedgerPaymentMode;
  reference: string | null;
  narration: string | null;
  documentId: string;
  documentNo: string;
};

export type LedgerAllocation = {
  documentId: string;
  documentNo: string;
  voucherNo: string;
  amount: number;
};

export type PartyLedgerEntry = {
  id: string;
  date: string | null;
  kind: LedgerEntryKind;
  voucherNo: string;
  particulars: string;
  debit: number;
  credit: number;
  balance: number;
  /** Invoice or bill to open; null when a payment was split across several bills. */
  documentId: string | null;
  paymentMode: LedgerPaymentMode | null;
  reference: string | null;
  /** Per-bill split of a payment (empty for invoices, bills and opening). */
  allocations: LedgerAllocation[];
};

export type PartyLedgerBook = {
  openingBalance: number;
  entries: PartyLedgerEntry[];
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
};

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function istDayKey(date: Date) {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

function paymentModeLabel(mode: LedgerPaymentMode) {
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

function documentParticulars(party: LedgerParty, docNo: string) {
  switch (party) {
    case "CUSTOMER":
      return `Sales invoice ${docNo}`;
    case "SUPPLIER":
      return `Raw material bill ${docNo}`;
    default: {
      const _exhaustive: never = party;
      return _exhaustive;
    }
  }
}

function paymentWord(party: LedgerParty) {
  switch (party) {
    case "CUSTOMER":
      return "receipt";
    case "SUPPLIER":
      return "payment";
    default: {
      const _exhaustive: never = party;
      return _exhaustive;
    }
  }
}

/**
 * One money movement can be split across several bills (e.g. ₹1.5L received, entered as
 * three receipts). Rows on the same IST day, mode and reference are one payment.
 */
export function groupPayments(payments: LedgerSourcePayment[]) {
  const groups = new Map<string, LedgerSourcePayment[]>();
  for (const payment of payments) {
    const reference = payment.reference?.trim().toLowerCase() ?? "";
    const key = `${istDayKey(payment.date)}|${payment.mode}|${reference}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(payment);
    else groups.set(key, [payment]);
  }
  return [...groups.values()].map((rows) =>
    [...rows].sort((a, b) => a.voucherNo.localeCompare(b.voucherNo, undefined, { numeric: true }))
  );
}

function groupedVoucherNo(rows: LedgerSourcePayment[]) {
  const first = rows[0]?.voucherNo ?? "";
  const last = rows[rows.length - 1]?.voucherNo ?? "";
  return rows.length > 1 ? `${first} – ${last}` : first;
}

function groupedParticulars(party: LedgerParty, rows: LedgerSourcePayment[]) {
  const narrations = [...new Set(rows.map((row) => row.narration?.trim()).filter(Boolean))];
  if (narrations.length === 1) return narrations[0]!;

  const first = rows[0]!;
  const docNos = [...new Set(rows.map((row) => row.documentNo).filter(Boolean))];
  const against = docNos.length > 0 ? ` against ${docNos.join(", ")}` : "";
  const reference = first.reference?.trim() ? ` · Ref ${first.reference.trim()}` : "";
  return `${paymentModeLabel(first.mode)} ${paymentWord(party)}${against}${reference}`;
}

export function buildPartyLedger(input: {
  party: LedgerParty;
  openingBalance: number;
  documents: LedgerSourceDocument[];
  payments: LedgerSourcePayment[];
}): PartyLedgerBook {
  type Draft = Omit<PartyLedgerEntry, "balance" | "date"> & {
    date: Date | null;
    sort: number;
  };

  const isCustomer = input.party === "CUSTOMER";
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
      documentId: null,
      paymentMode: null,
      reference: null,
      allocations: [],
      sort: 0,
    });
  }

  for (const document of input.documents) {
    const amount = roundMoney(document.amount);
    drafts.push({
      id: document.id,
      date: document.date,
      kind: isCustomer ? "INVOICE" : "BILL",
      voucherNo: document.docNo,
      particulars: documentParticulars(input.party, document.docNo),
      debit: isCustomer ? amount : 0,
      credit: isCustomer ? 0 : amount,
      documentId: document.id,
      paymentMode: null,
      reference: null,
      allocations: [],
      sort: 1,
    });
  }

  for (const rows of groupPayments(input.payments)) {
    const first = rows[0]!;
    const amount = roundMoney(rows.reduce((sum, row) => sum + row.amount, 0));
    const documentIds = new Set(rows.map((row) => row.documentId));
    drafts.push({
      id: first.id,
      date: first.date,
      kind: isCustomer ? "RECEIPT" : "PAYMENT",
      voucherNo: groupedVoucherNo(rows),
      particulars: groupedParticulars(input.party, rows),
      debit: isCustomer ? 0 : amount,
      credit: isCustomer ? amount : 0,
      documentId: documentIds.size === 1 ? first.documentId : null,
      paymentMode: first.mode,
      reference: first.reference?.trim() || null,
      allocations: rows.map((row) => ({
        documentId: row.documentId,
        documentNo: row.documentNo,
        voucherNo: row.voucherNo,
        amount: roundMoney(row.amount),
      })),
      sort: 2,
    });
  }

  drafts.sort((a, b) => {
    const aTime = a.date?.getTime() ?? 0;
    const bTime = b.date?.getTime() ?? 0;
    if (aTime !== bTime) return aTime - bTime;
    if (a.sort !== b.sort) return a.sort - b.sort;
    return a.voucherNo.localeCompare(b.voucherNo, undefined, { numeric: true });
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

/** Raw-material supplier names are typed by hand ("N.V.Auto industries", "NV auto industries"). */
export function supplierKey(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}
