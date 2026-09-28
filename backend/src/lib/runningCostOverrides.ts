import { prisma } from "./prisma.js";
import { ApiError } from "../middleware/errorHandler.js";
import { BUSINESS_START, monthKey, type RunningCostLineId } from "./manufacturingPnl.js";

/** Longest From → To range saved in one edit. */
const MAX_RANGE_MONTHS = 36;

export type CostOverridesByMonth = Map<string, Partial<Record<RunningCostLineId, number>>>;

export async function loadRunningCostOverrides(): Promise<CostOverridesByMonth> {
  const rows = await prisma.runningCostOverride.findMany({
    select: { lineId: true, month: true, amount: true },
  });
  const byMonth: CostOverridesByMonth = new Map();
  for (const row of rows) {
    const month = byMonth.get(row.month) ?? {};
    month[row.lineId as RunningCostLineId] = Number(row.amount);
    byMonth.set(row.month, month);
  }
  return byMonth;
}

function parseMonth(value: string): { year: number; month: number } {
  const [year, month] = value.split("-").map(Number);
  return { year, month };
}

/** Inclusive `YYYY-MM` keys from `from` to `to`. */
export function monthsInRange(from: string, to: string): string[] {
  if (from > to) throw new ApiError(400, "From month must be on or before To month");
  const start = parseMonth(from);
  if (from < monthKey(BUSINESS_START.year, BUSINESS_START.month)) {
    throw new ApiError(400, "Running costs start from July 2026");
  }
  const keys: string[] = [];
  let { year, month } = start;
  while (monthKey(year, month) <= to) {
    keys.push(monthKey(year, month));
    if (keys.length > MAX_RANGE_MONTHS) {
      throw new ApiError(400, `Pick at most ${MAX_RANGE_MONTHS} months at a time`);
    }
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return keys;
}

export async function setRunningCostOverrides(input: {
  lineId: RunningCostLineId;
  fromMonth: string;
  toMonth: string;
  amount: number;
}): Promise<string[]> {
  const months = monthsInRange(input.fromMonth, input.toMonth);
  await prisma.$transaction(
    months.map((month) =>
      prisma.runningCostOverride.upsert({
        where: { lineId_month: { lineId: input.lineId, month } },
        create: { lineId: input.lineId, month, amount: input.amount },
        update: { amount: input.amount },
      })
    )
  );
  return months;
}

export async function resetRunningCostOverrides(input: {
  lineId: RunningCostLineId;
  fromMonth: string;
  toMonth: string;
}): Promise<string[]> {
  const months = monthsInRange(input.fromMonth, input.toMonth);
  await prisma.runningCostOverride.deleteMany({
    where: { lineId: input.lineId, month: { in: months } },
  });
  return months;
}
