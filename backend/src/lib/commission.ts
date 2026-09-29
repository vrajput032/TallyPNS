import type { CommissionType } from "@prisma/client";
import { round2 } from "./manufacturingPnl.js";

type CommissionItem = { productId?: string | null; quantity: number; rate: number };

export type CommissionRateInput = {
  commissionType: CommissionType | null;
  commissionRate: unknown;
};

/**
 * Commission a customer earns on one bill from their saved rate.
 * Per piece counts catalog (pipe) lines only; percent is on the value before GST. Trading bills earn nothing.
 */
export function calcInvoiceCommission(
  customer: CommissionRateInput,
  items: CommissionItem[],
  isTrading: boolean
): number {
  const rate = Number(customer.commissionRate ?? 0);
  if (isTrading || !customer.commissionType || !Number.isFinite(rate) || rate <= 0) return 0;
  switch (customer.commissionType) {
    case "PER_PIECE": {
      const pieces = items
        .filter((item) => item.productId?.trim())
        .reduce((sum, item) => sum + item.quantity, 0);
      return round2(pieces * rate);
    }
    case "PERCENT": {
      const taxable = items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
      return round2((taxable * rate) / 100);
    }
    case "PER_BILL":
      return round2(rate);
    default: {
      const _exhaustive: never = customer.commissionType;
      return _exhaustive;
    }
  }
}
