/** Factory costing rates. Add a new monthly expense here when it comes up. */

export const PNL_YIELD = [
  { sizeMm: 95, grams: 106, piecesPerKg: 9 },
  { sizeMm: 85, grams: 90, piecesPerKg: 11 },
  { sizeMm: 110, grams: 126, piecesPerKg: 7 },
] as const;

/** Scrap kg is 12% of raw-material kg, valued at a flat ₹30/kg. */
export const SCRAP_PERCENT_OF_RM = 12;
export const SCRAP_RATE_PER_KG = 30;
export const THEKEDAR_PER_PIECE = 1.5;
export const MONTHLY_RENT = 20_000;
export const MONTHLY_AKSHAY_SALARY = 20_000;

/** Business started July 2026 — P&L months never go earlier. */
export const BUSINESS_START = { year: 2026, month: 7 } as const;

export const ELECTRICITY_BY_MONTH: Record<string, number> = {
  "2026-08": 3_000,
};

/** Delivery ₹ by `YYYY-MM`. Empty until isolated delivery totals are added. */
export const DELIVERY_BY_MONTH: Record<string, number> = {};

export type PnlLine = {
  id: string;
  label: string;
  amount: number;
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

export type MonthPnlInput = {
  year: number;
  month: number;
  monthLabel: string;
  pipeSalesTaxable: number;
  otherSalesTaxable: number;
  rmTaxable: number;
  rmKg: number;
  piecesSold: number;
  unsizedPieces: number;
  piecesSoldBySize: PiecesSoldRow[];
  /** Kiraya / delivery from partner expenses for this month. */
  delivery?: number;
  /** Other factory items parsed from partner expense notes. */
  otherExpenses?: number;
  /** Electricity bills from pns-expenses; falls back to hardcoded month amounts. */
  electricityFromExpenses?: number;
  expenseEntries?: {
    id: string;
    label: string;
    amount: number;
    kind: "delivery" | "other" | "electricity" | "skipped";
    skipReason?: string;
  }[];
  partnerExpenses?: {
    id: string;
    date: string;
    description: string;
    amount: number;
    paidBy?: string;
    billUrl?: string | null;
  }[];
  expensesFetchedAt?: string | null;
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
  expenseEntries: {
    id: string;
    label: string;
    amount: number;
    kind: "delivery" | "other" | "electricity" | "skipped";
    skipReason?: string;
  }[];
  partnerExpenses: {
    id: string;
    date: string;
    description: string;
    amount: number;
    paidBy?: string;
    billUrl?: string | null;
  }[];
  expensesFetchedAt: string | null;
  totalIncome: number;
  totalCosts: number;
  net: number;
};

export function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function electricityForMonth(year: number, month: number): number {
  return ELECTRICITY_BY_MONTH[monthKey(year, month)] ?? 0;
}

export function deliveryForMonth(year: number, month: number): number {
  return DELIVERY_BY_MONTH[monthKey(year, month)] ?? 0;
}

export function scrapKgFromRmKg(rmKg: number): number {
  const safeKg = Number.isFinite(rmKg) && rmKg > 0 ? rmKg : 0;
  return round2(safeKg * (SCRAP_PERCENT_OF_RM / 100));
}

export function yieldFromKg(rmKg: number): YieldHintRow[] {
  const safeKg = Number.isFinite(rmKg) && rmKg > 0 ? rmKg : 0;
  return PNL_YIELD.map((row) => ({
    sizeMm: row.sizeMm,
    grams: row.grams,
    piecesPerKg: row.piecesPerKg,
    pieces: round2(safeKg * row.piecesPerKg),
  }));
}

export function monthLabel(year: number, month: number): string {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Inclusive months from July 2026 through the current local calendar month. */
export function businessMonthsThrough(now = new Date()): { year: number; month: number }[] {
  const endYear = now.getFullYear();
  const endMonth = now.getMonth() + 1;
  const result: { year: number; month: number }[] = [];
  let year: number = BUSINESS_START.year;
  let month: number = BUSINESS_START.month;
  while (year < endYear || (year === endYear && month <= endMonth)) {
    result.push({ year, month });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return result;
}

export function buildMonthPnl(input: MonthPnlInput): MonthPnl {
  const scrapRatePerKg = SCRAP_RATE_PER_KG;
  const scrapKg = scrapKgFromRmKg(input.rmKg);
  const scrapIncome = round2(scrapKg * scrapRatePerKg);
  const thekedar = round2(input.piecesSold * THEKEDAR_PER_PIECE);
  const rent = MONTHLY_RENT;
  const electricityFromExpenses = round2(input.electricityFromExpenses ?? 0);
  const electricity =
    electricityFromExpenses > 0 ? electricityFromExpenses : electricityForMonth(input.year, input.month);
  const salary = MONTHLY_AKSHAY_SALARY;
  const delivery = round2((input.delivery ?? 0) + deliveryForMonth(input.year, input.month));
  const otherExpenses = round2(input.otherExpenses ?? 0);
  const expenseEntries = input.expenseEntries ?? [];

  const pipeSales = round2(input.pipeSalesTaxable);
  const otherSales = round2(input.otherSalesTaxable);
  const rmTaxable = round2(input.rmTaxable);

  const income: PnlLine[] = [
    { id: "pipe-sales", label: "Pipe sales", amount: pipeSales },
    { id: "other-sales", label: "Other invoiced sales", amount: otherSales },
    {
      id: "scrap",
      label: `Scrap / wastage (${SCRAP_PERCENT_OF_RM}% of RM · ₹${SCRAP_RATE_PER_KG}/kg)`,
      amount: scrapIncome,
    },
  ];
  const costs: PnlLine[] = [
    { id: "raw-material", label: "Raw material", amount: rmTaxable },
    { id: "thekedar", label: "Thekedar", amount: thekedar },
    { id: "rent", label: "Rent", amount: rent },
    { id: "electricity", label: "Electricity", amount: electricity },
    { id: "akshay-salary", label: "Akshay salary", amount: salary },
    { id: "delivery", label: "Delivery (kiraya)", amount: delivery },
    { id: "other-expenses", label: "Other factory expenses", amount: otherExpenses },
  ];

  const totalIncome = round2(income.reduce((sum, line) => sum + line.amount, 0));
  const totalCosts = round2(costs.reduce((sum, line) => sum + line.amount, 0));

  return {
    year: input.year,
    month: input.month,
    monthLabel: input.monthLabel,
    scrapRatePerKg,
    rmKg: round2(input.rmKg),
    scrapKg,
    piecesSold: round2(input.piecesSold),
    unsizedPieces: round2(input.unsizedPieces),
    piecesSoldBySize: input.piecesSoldBySize.map((row) => ({
      sizeMm: row.sizeMm,
      quantity: round2(row.quantity),
    })),
    yieldHint: yieldFromKg(input.rmKg),
    income,
    costs,
    expenseEntries,
    partnerExpenses: input.partnerExpenses ?? [],
    expensesFetchedAt: input.expensesFetchedAt ?? null,
    totalIncome,
    totalCosts,
    net: round2(totalIncome - totalCosts),
  };
}

export function emptyMonthAggregates(year: number, month: number): Omit<MonthPnlInput, "monthLabel"> {
  return {
    year,
    month,
    pipeSalesTaxable: 0,
    otherSalesTaxable: 0,
    rmTaxable: 0,
    rmKg: 0,
    piecesSold: 0,
    unsizedPieces: 0,
    piecesSoldBySize: [],
  };
}
