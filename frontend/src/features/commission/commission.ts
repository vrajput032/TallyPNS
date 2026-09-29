import { formatInr } from "@/lib/formatInr";

export type CommissionType = "PER_PIECE" | "PERCENT" | "PER_BILL";

export const COMMISSION_TYPES: CommissionType[] = ["PER_PIECE", "PERCENT", "PER_BILL"];

export function commissionTypeLabel(type: CommissionType): string {
  switch (type) {
    case "PER_PIECE":
      return "₹ per piece";
    case "PERCENT":
      return "% of bill (before GST)";
    case "PER_BILL":
      return "₹ per bill";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function parseCommissionType(value: unknown): CommissionType | null {
  return COMMISSION_TYPES.find((type) => type === value) ?? null;
}

/** Short rate text, e.g. "₹2 / pc", "1.5%", "₹500 / bill". */
export function formatCommissionRate(type: CommissionType | null, rate: number | string | null): string {
  const value = Number(rate ?? 0);
  if (!type || !Number.isFinite(value) || value <= 0) return "No commission";
  switch (type) {
    case "PER_PIECE":
      return `₹${formatInr(value)} / pc`;
    case "PERCENT":
      return `${value}%`;
    case "PER_BILL":
      return `₹${formatInr(value)} / bill`;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

type CommissionItem = { productId?: string | null; quantity: number; rate: number };

/** Same rule as the backend: per piece counts catalog lines only; percent is on value before GST; trading earns 0. */
export function calcInvoiceCommission(
  type: CommissionType | null,
  rate: number | string | null,
  items: CommissionItem[],
  isTrading: boolean
): number {
  const value = Number(rate ?? 0);
  if (isTrading || !type || !Number.isFinite(value) || value <= 0) return 0;
  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  switch (type) {
    case "PER_PIECE":
      return round2(
        items.filter((item) => item.productId?.trim()).reduce((sum, item) => sum + (item.quantity || 0), 0) * value
      );
    case "PERCENT":
      return round2(
        (items.reduce((sum, item) => sum + (item.quantity || 0) * (item.rate || 0), 0) * value) / 100
      );
    case "PER_BILL":
      return round2(value);
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}
