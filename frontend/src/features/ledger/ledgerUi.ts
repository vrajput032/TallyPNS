import type { LedgerEntryKind } from "./types";

export function formatLedgerDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

export function formatLedgerBalance(value: number) {
  const abs = Math.abs(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (value > 0.009) return `${abs} Dr`;
  if (value < -0.009) return `${abs} Cr`;
  return abs;
}

export function moneyOrBlank(value: number) {
  if (Math.abs(value) <= 0.009) return "";
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export type LedgerParty = "CUSTOMER" | "SUPPLIER";

/** Red while money is still outstanding: customers owe us (Dr), we owe suppliers (Cr). */
export function balanceTone(value: number, party: LedgerParty = "CUSTOMER") {
  const outstanding = party === "CUSTOMER" ? value > 0.009 : value < -0.009;
  return outstanding ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400";
}

export function ledgerPath(party: LedgerParty, partyId: string) {
  switch (party) {
    case "CUSTOMER":
      return `/ledger/${partyId}`;
    case "SUPPLIER":
      return `/ledger/suppliers/${encodeURIComponent(partyId)}`;
    default: {
      const _exhaustive: never = party;
      return _exhaustive;
    }
  }
}

export function ledgerListPath(party: LedgerParty) {
  return party === "SUPPLIER" ? "/ledger?tab=suppliers" : "/ledger";
}

/** Sales invoice for customers, raw material bill for suppliers. */
export function ledgerDocumentPath(party: LedgerParty, documentId: string) {
  switch (party) {
    case "CUSTOMER":
      return `/sales/${documentId}`;
    case "SUPPLIER":
      return `/raw-material/${documentId}`;
    default: {
      const _exhaustive: never = party;
      return _exhaustive;
    }
  }
}

export function isPaymentEntry(kind: LedgerEntryKind) {
  return kind === "RECEIPT" || kind === "PAYMENT";
}

export function customerInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function ledgerPrintFileName(partyName: string) {
  const slug =
    partyName
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "customer";
  return `PNS-ledger-${slug}-${new Date().toISOString().slice(0, 10)}`;
}

export function kindLabel(kind: LedgerEntryKind) {
  switch (kind) {
    case "OPENING":
      return "Opening";
    case "INVOICE":
      return "Invoice";
    case "RECEIPT":
      return "Receipt";
    case "BILL":
      return "Bill";
    case "PAYMENT":
      return "Payment";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
