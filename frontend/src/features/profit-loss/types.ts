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
  months: MonthPnl[];
  totalIncome: number;
  totalCosts: number;
  net: number;
};

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
