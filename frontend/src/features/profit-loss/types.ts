export const SCRAP_GRADES = ["iron87", "iron95"] as const;
export type ScrapGrade = (typeof SCRAP_GRADES)[number];

export type PnlLine = {
  id: string;
  label: string;
  amount: number;
};

export type ExpenseEntryKind = "delivery" | "other" | "electricity" | "skipped";

export type ExpenseEntry = {
  id: string;
  label: string;
  amount: number;
  kind: ExpenseEntryKind;
  skipReason?: string;
};

export type YieldHintRow = {
  sizeMm: number;
  grams: number;
  piecesPerKg: number;
  pieces: number;
};

export type PiecesSoldRow = {
  sizeMm: number;
  quantity: number;
};

export type PartnerExpenseRow = {
  id: string;
  date: string;
  description: string;
  amount: number;
  paidBy?: string;
  billUrl?: string | null;
};

export type MonthPnl = {
  year: number;
  month: number;
  monthLabel: string;
  scrapGrade: ScrapGrade;
  scrapRatePerKg: number;
  rmKg: number;
  scrapKg: number;
  piecesSold: number;
  unsizedPieces: number;
  piecesSoldBySize: PiecesSoldRow[];
  yieldHint: YieldHintRow[];
  income: PnlLine[];
  costs: PnlLine[];
  expenseEntries: ExpenseEntry[];
  partnerExpenses: PartnerExpenseRow[];
  expensesFetchedAt: string | null;
  totalIncome: number;
  totalCosts: number;
  net: number;
};

export type PnlSummary = {
  scrapGrade: ScrapGrade;
  months: MonthPnl[];
  totalIncome: number;
  totalCosts: number;
  net: number;
};

export function isScrapGrade(value: string): value is ScrapGrade {
  return (SCRAP_GRADES as readonly string[]).includes(value);
}

export function expenseKindLabel(kind: ExpenseEntryKind): string {
  switch (kind) {
    case "delivery":
      return "Delivery";
    case "other":
      return "Other";
    case "electricity":
      return "Electricity";
    case "skipped":
      return "Already counted";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function scrapGradeLabel(grade: ScrapGrade): string {
  switch (grade) {
    case "iron87":
      return "87 iron · ₹30/kg";
    case "iron95":
      return "95+ iron · ₹39/kg";
    default: {
      const _exhaustive: never = grade;
      return _exhaustive;
    }
  }
}

const STORAGE_PREFIX = "pnl.scrapGrade.";

export function scrapGradeStorageKey(year: number, month: number) {
  return `${STORAGE_PREFIX}${year}-${String(month).padStart(2, "0")}`;
}

export function readStoredScrapGrade(year: number, month: number): ScrapGrade {
  try {
    const value = window.localStorage.getItem(scrapGradeStorageKey(year, month));
    if (value && isScrapGrade(value)) return value;
  } catch {
    // ignore quota / private mode
  }
  return "iron87";
}

export function writeStoredScrapGrade(year: number, month: number, grade: ScrapGrade) {
  try {
    window.localStorage.setItem(scrapGradeStorageKey(year, month), grade);
  } catch {
    // ignore quota / private mode
  }
}
