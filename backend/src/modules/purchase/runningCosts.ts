import { prisma } from "../../lib/prisma.js";
import { activeOnly } from "../../lib/activeRecords.js";
import { monthKey, monthLabel, round2 } from "../../lib/manufacturingPnl.js";
import { getProfitLossSummary } from "../profit-loss/profit-loss.service.js";

/** P&L cost lines that are material, not monthly running cost. */
const NON_RUNNING_COST_LINES = new Set(["raw-material"]);

export type RunningCostLine = { id: string; label: string; amount: number };

export type RunningCostEntry = {
  id: string;
  billNo: string;
  title: string | null;
  billDate: Date;
  totalAmount: number;
};

export type RunningCostMonth = {
  key: string;
  label: string;
  /** Costs already counted in Profit & Loss (rent, salary, electricity, thekedar, delivery, partner expenses) */
  pnlLines: RunningCostLine[];
  pnlTotal: number;
  /** Running-cost purchase bills entered in Purchase */
  entries: RunningCostEntry[];
  entriesTotal: number;
  total: number;
};

function emptyMonth(key: string, label: string): RunningCostMonth {
  return { key, label, pnlLines: [], pnlTotal: 0, entries: [], entriesTotal: 0, total: 0 };
}

export async function getMonthlyRunningCosts() {
  const [pnl, bills] = await Promise.all([
    getProfitLossSummary(),
    prisma.purchaseBill.findMany({
      where: { ...activeOnly, kind: "RUNNING_COST" },
      select: { id: true, billNo: true, title: true, billDate: true, totalAmount: true },
      orderBy: { billDate: "desc" },
    }),
  ]);

  const months = new Map<string, RunningCostMonth>();
  for (const report of pnl.months) {
    const key = monthKey(report.year, report.month);
    const month = emptyMonth(key, report.monthLabel);
    month.pnlLines = report.costs
      .filter((line) => !NON_RUNNING_COST_LINES.has(line.id))
      .map((line) => ({ id: line.id, label: line.label, amount: round2(line.amount) }));
    month.pnlTotal = round2(month.pnlLines.reduce((sum, line) => sum + line.amount, 0));
    months.set(key, month);
  }

  for (const bill of bills) {
    const year = bill.billDate.getUTCFullYear();
    const monthNumber = bill.billDate.getUTCMonth() + 1;
    const key = monthKey(year, monthNumber);
    const month = months.get(key) ?? emptyMonth(key, monthLabel(year, monthNumber));
    month.entries.push({ ...bill, totalAmount: round2(Number(bill.totalAmount)) });
    months.set(key, month);
  }

  const result = [...months.values()]
    .map((month) => {
      const entriesTotal = round2(month.entries.reduce((sum, entry) => sum + entry.totalAmount, 0));
      return { ...month, entriesTotal, total: round2(month.pnlTotal + entriesTotal) };
    })
    .sort((a, b) => (a.key < b.key ? 1 : a.key > b.key ? -1 : 0));

  const pnlTotal = round2(result.reduce((sum, month) => sum + month.pnlTotal, 0));
  const entriesTotal = round2(result.reduce((sum, month) => sum + month.entriesTotal, 0));

  return {
    months: result,
    totals: { pnl: pnlTotal, entries: entriesTotal, combined: round2(pnlTotal + entriesTotal) },
  };
}
