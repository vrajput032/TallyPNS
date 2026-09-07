/** Partner expenses from pns-expenses. Duplicate split rows are one bill. */

import {
  isOneTimeInvestmentDescription,
  ONE_TIME_INVESTMENT_SKIP_REASON,
} from "./oneTimeInvestment.js";

const EXPENSES_URL = "https://pns-expenses.netlify.app/api/expenses";
const ALREADY_COUNTED_RENT = 20_000;
const ALREADY_COUNTED_SALARY = 20_000;

export type PartnerExpense = {
  id: string;
  date: string;
  description: string;
  amount: number;
  paidBy?: string;
  billUrl?: string | null;
  createdAt?: string;
};

export type ExpenseEntryKind = "delivery" | "other" | "electricity" | "skipped";

export type ExpenseEntry = {
  id: string;
  label: string;
  amount: number;
  kind: ExpenseEntryKind;
  skipReason?: string;
};

export type MonthExpenseBreakdown = {
  delivery: number;
  other: number;
  electricity: number;
  entries: ExpenseEntry[];
};

export type PartnerExpensesSnapshot = {
  fetchedAt: string;
  byMonth: Record<string, MonthExpenseBreakdown>;
  expensesByMonth: Record<string, PartnerExpense[]>;
};

type ParsedLine = { label: string; amount: number };

/** Words that sit in front of kiraya when the ₹ amount comes after (e.g. "tempo kiraya 500"). */
const AMOUNT_AFTER_WORDS = new Set([
  "cnc",
  "tempo",
  "pipe",
  "hydra",
  "jcb",
  "rikshaw",
  "rickshaw",
  "porter",
]);

let lastGood: PartnerExpensesSnapshot | null = null;

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toAmount(num: string, kSuffix: string | undefined): number {
  const n = Number(num.replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return kSuffix ? n * 1000 : n;
}

function lastWord(text: string): string {
  const match = text.trim().match(/([A-Za-z][A-Za-z0-9./-]{0,16})$/);
  return match ? match[1].toLowerCase() : "";
}

function normalizeDescription(description: string): string {
  return description.trim().replace(/\s+/g, " ").toLowerCase();
}

function emptySnapshot(): PartnerExpensesSnapshot {
  return { fetchedAt: "", byMonth: {}, expensesByMonth: {} };
}

function expensesByMonthFrom(expenses: PartnerExpense[]): Record<string, PartnerExpense[]> {
  const byMonth: Record<string, PartnerExpense[]> = {};
  for (const expense of expenses) {
    const month = (expense.date ?? "").slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) continue;
    const list = byMonth[month] ?? [];
    list.push(expense);
    byMonth[month] = list;
  }
  return byMonth;
}

/** Same date + same note from two partners (e.g. 32450 + 32450 = 64900) is one bill. */
export function mergeSplitExpenses(expenses: PartnerExpense[]): PartnerExpense[] {
  const groups = new Map<string, PartnerExpense[]>();
  for (const expense of expenses) {
    const date = expense.date?.slice(0, 10) ?? "";
    const key = `${date}|${normalizeDescription(expense.description ?? "")}`;
    const list = groups.get(key) ?? [];
    list.push(expense);
    groups.set(key, list);
  }

  const merged: PartnerExpense[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      merged.push(group[0]);
      continue;
    }
    const description = group[0].description?.trim() ?? "";
    const summed = group.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    const totalMatch = [...description.matchAll(/(\d+)\s*total\b/gi)].pop();
    const notedTotal = totalMatch ? Number(totalMatch[1]) : NaN;
    const amount =
      Number.isFinite(notedTotal) && notedTotal > 0 && Math.abs(notedTotal - summed) < 1
        ? notedTotal
        : summed;
    const paidBy = [
      ...new Set(group.map((row) => row.paidBy?.trim()).filter((name): name is string => Boolean(name))),
    ].join(" + ");
    const billUrl = group.find((row) => row.billUrl)?.billUrl ?? null;
    merged.push({
      id: group.map((row) => row.id).join("+"),
      date: group[0].date,
      description,
      amount,
      paidBy: paidBy || undefined,
      billUrl,
    });
  }
  return merged;
}

/** Amount-first list: `6000 kiraya baddi 200 bestone kiraya … 64900 total`. */
export function parseAmountFirstLines(text: string): ParsedLine[] {
  const tokenRe = /(\d+(?:\.\d+)?)(k)?/gi;
  const matches = [...text.matchAll(tokenRe)].filter((match) => {
    const index = match.index ?? 0;
    const preceding = text.slice(Math.max(0, index - 2), index);
    return text[index - 1] !== "," && !/,\s*$/.test(preceding);
  });
  const lines: ParsedLine[] = [];
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const amount = toAmount(match[1], match[2]);
    if (amount <= 0) continue;
    const start = (match.index ?? 0) + match[0].length;
    const end = matches[i + 1]?.index ?? text.length;
    const label = text
      .slice(start, end)
      .replace(/^[,\s]+|[,\s]+$/g, "")
      .replace(/\s+/g, " ");
    lines.push({ label: label || "Other", amount });
  }
  return lines;
}

export function isAmountFirstLump(text: string): boolean {
  const totals = [...text.matchAll(/(\d+)\s*total\b/gi)];
  const hasLargeTotal = totals.some((m) => Number(m[1]) >= 10_000);
  return hasLargeTotal && !/\d+k\b/i.test(text);
}

export function kirayaAmountsFromText(text: string): number[] {
  const amounts: number[] = [];
  const source = text;
  const re = /\bkiraya\b/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) {
    const before = source.slice(0, match.index);
    const after = source.slice(match.index + match[0].length);
    const afterExplicit = after.match(/^\s*[-:–]\s*(\d+(?:\.\d+)?)(k)?\b/i);
    const afterBare = after.match(/^\s+(\d+(?:\.\d+)?)(k)?\b/i);
    const beforeBare = before.match(/(\d+(?:\.\d+)?)(k)?\s+$/i);
    const beforeWord = before.match(/(\d+(?:\.\d+)?)(k)?\s+[A-Za-z][A-Za-z0-9./-]{0,16}\s+$/i);

    let chosen = 0;
    if (afterExplicit) {
      chosen = toAmount(afterExplicit[1], afterExplicit[2]);
    } else if (beforeBare) {
      chosen = toAmount(beforeBare[1], beforeBare[2]);
    } else if (afterBare && beforeWord && AMOUNT_AFTER_WORDS.has(lastWord(before))) {
      chosen = toAmount(afterBare[1], afterBare[2]);
    } else if (beforeWord) {
      chosen = toAmount(beforeWord[1], beforeWord[2]);
    } else if (afterBare) {
      chosen = toAmount(afterBare[1], afterBare[2]);
    }
    if (chosen > 0) amounts.push(chosen);
  }
  return amounts;
}

function classifyLine(line: ParsedLine): Pick<ExpenseEntry, "kind" | "skipReason"> {
  const label = line.label.toLowerCase();
  if (/\btotal\b/.test(label)) {
    return { kind: "skipped", skipReason: "Running total in the note" };
  }
  if (/\bkiraya\b/.test(label)) {
    return { kind: "delivery" };
  }
  if (isOneTimeInvestmentDescription(line.label)) {
    return { kind: "skipped", skipReason: ONE_TIME_INVESTMENT_SKIP_REASON };
  }
  if (line.amount === ALREADY_COUNTED_RENT && /\brent\b/.test(label)) {
    return { kind: "skipped", skipReason: "Already in monthly rent" };
  }
  if (line.amount === ALREADY_COUNTED_SALARY && /\bakshay\b/.test(label)) {
    return { kind: "skipped", skipReason: "Already in Akshay salary" };
  }
  return { kind: "other" };
}

function entriesFromLines(prefix: string, lines: ParsedLine[]): ExpenseEntry[] {
  return lines.map((line, index) => {
    const classified = classifyLine(line);
    return {
      id: `${prefix}-${index}`,
      label: line.label,
      amount: round2(line.amount),
      kind: classified.kind,
      skipReason: classified.skipReason,
    };
  });
}

export function skipReasonForWholeExpense(description: string, amount: number): string | null {
  const d = description.toLowerCase();
  if (
    /current acc|current account|company account|company current|\btransferred\b|sent to |sent in |transfer to /.test(
      d
    )
  ) {
    return "Partner transfer / current account";
  }
  if (/raw material/.test(d)) {
    return "Raw material (already in RM bills)";
  }
  if (isOneTimeInvestmentDescription(description)) {
    return ONE_TIME_INVESTMENT_SKIP_REASON;
  }
  if (/bank funding/.test(d)) {
    return "Bank funding (not a factory cost)";
  }
  if (/rent security/.test(d)) {
    return "Rent security (deposit)";
  }
  if (amount === ALREADY_COUNTED_RENT && /\brent\b/.test(d)) {
    return "Already in monthly rent";
  }
  if (amount === ALREADY_COUNTED_SALARY && /\bakshay\b/.test(d) && !/transferred|current acc/.test(d)) {
    return "Already in Akshay salary";
  }
  return null;
}

function isElectricityBill(description: string): boolean {
  const d = description.toLowerCase();
  return /electricity bill/.test(d) || /^electricity\b/.test(d);
}

export function entriesFromExpense(expense: PartnerExpense): ExpenseEntry[] {
  const description = expense.description?.trim() ?? "";
  const amount = Number(expense.amount) || 0;
  const prefix = expense.id;

  if (isAmountFirstLump(description)) {
    return entriesFromLines(prefix, parseAmountFirstLines(description));
  }

  if (/\bkiraya\b/i.test(description)) {
    const parsed = kirayaAmountsFromText(description);
    const amounts = parsed.length > 0 ? parsed : amount > 0 ? [amount] : [];
    return amounts.map((kirayaAmount, index) => ({
      id: `${prefix}-kiraya-${index}`,
      label: description.length > 80 ? "Kiraya" : description,
      amount: round2(kirayaAmount),
      kind: "delivery" as const,
    }));
  }

  const skipReason = skipReasonForWholeExpense(description, amount);
  if (skipReason) {
    return amount > 0
      ? [{ id: prefix, label: description, amount: round2(amount), kind: "skipped", skipReason }]
      : [];
  }

  if (isElectricityBill(description) && amount > 0) {
    return [{ id: prefix, label: description, amount: round2(amount), kind: "electricity" }];
  }

  if (amount > 0) {
    return [{ id: prefix, label: description, amount: round2(amount), kind: "other" }];
  }
  return [];
}

function emptyBreakdown(): MonthExpenseBreakdown {
  return { delivery: 0, other: 0, electricity: 0, entries: [] };
}

function addEntries(target: MonthExpenseBreakdown, entries: ExpenseEntry[]) {
  for (const entry of entries) {
    target.entries.push(entry);
    switch (entry.kind) {
      case "delivery":
        target.delivery = round2(target.delivery + entry.amount);
        break;
      case "other":
        target.other = round2(target.other + entry.amount);
        break;
      case "electricity":
        target.electricity = round2(target.electricity + entry.amount);
        break;
      case "skipped":
        break;
      default: {
        const _exhaustive: never = entry.kind;
        return _exhaustive;
      }
    }
  }
}

export function breakdownFromExpenses(expenses: PartnerExpense[]): Record<string, MonthExpenseBreakdown> {
  const byMonth: Record<string, MonthExpenseBreakdown> = {};
  const merged = mergeSplitExpenses(expenses);

  for (const expense of merged) {
    const month = (expense.date ?? "").slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) continue;
    const bucket = byMonth[month] ?? emptyBreakdown();
    if (!byMonth[month]) byMonth[month] = bucket;
    addEntries(bucket, entriesFromExpense(expense));
  }

  return byMonth;
}

export function sumKirayaByMonth(expenses: PartnerExpense[]): Record<string, number> {
  const byMonth = breakdownFromExpenses(expenses);
  const totals: Record<string, number> = {};
  for (const [month, row] of Object.entries(byMonth)) {
    totals[month] = row.delivery;
  }
  return totals;
}

export async function loadPartnerExpensesSnapshot(): Promise<PartnerExpensesSnapshot> {
  try {
    const response = await fetch(`${EXPENSES_URL}?t=${Date.now()}`, {
      headers: { "Cache-Control": "no-cache" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      throw new Error(`partner expenses HTTP ${response.status}`);
    }
    const payload = (await response.json()) as { expenses?: PartnerExpense[] };
    const expenses = payload.expenses ?? [];
    const merged = mergeSplitExpenses(expenses);
    const snapshot: PartnerExpensesSnapshot = {
      fetchedAt: new Date().toISOString(),
      byMonth: breakdownFromExpenses(expenses),
      expensesByMonth: expensesByMonthFrom(merged),
    };
    lastGood = snapshot;
    return snapshot;
  } catch (error) {
    console.error("[profit-loss] partner expense fetch failed", error);
    return lastGood ?? emptySnapshot();
  }
}

export async function loadExpenseBreakdownByMonth(): Promise<Record<string, MonthExpenseBreakdown>> {
  const snapshot = await loadPartnerExpensesSnapshot();
  return snapshot.byMonth;
}

/** @deprecated use loadExpenseBreakdownByMonth */
export async function loadKirayaDeliveryByMonth(): Promise<Record<string, number>> {
  const byMonth = await loadExpenseBreakdownByMonth();
  const totals: Record<string, number> = {};
  for (const [month, row] of Object.entries(byMonth)) {
    totals[month] = row.delivery;
  }
  return totals;
}
