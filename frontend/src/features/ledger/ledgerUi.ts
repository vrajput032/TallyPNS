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

export function balanceTone(value: number) {
  return value > 0.009 ? "text-red-600 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400";
}

export function customerInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

export function kindLabel(kind: LedgerEntryKind) {
  switch (kind) {
    case "OPENING":
      return "Opening";
    case "INVOICE":
      return "Invoice";
    case "RECEIPT":
      return "Receipt";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}
