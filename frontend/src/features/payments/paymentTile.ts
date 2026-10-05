import type { PaymentStatus } from "./types";

export type PaymentTileTone = PaymentStatus | "DUE" | "OVERDUE";

export function dueAwareTileTone({
  status,
  balance,
  daysUntilDue,
}: {
  status: PaymentStatus;
  balance: number;
  daysUntilDue: number | null;
}): PaymentTileTone {
  if (status === "PAID" || balance <= 0) return "PAID";
  if (daysUntilDue !== null && daysUntilDue < 0) return "OVERDUE";
  if (daysUntilDue !== null && daysUntilDue <= 7) return "DUE";
  return status;
}

export function paymentTileClass(status: PaymentTileTone) {
  switch (status) {
    case "PAID":
      return "border-emerald-400/45 bg-gradient-to-br from-emerald-300 via-green-200 to-teal-100 shadow-[0_10px_28px_-10px_rgba(16,185,129,0.55)] dark:border-emerald-500/35 dark:from-emerald-700/80 dark:via-emerald-800/55 dark:to-teal-950/70 dark:shadow-[0_10px_28px_-10px_rgba(16,185,129,0.35)]";
    case "PARTIAL":
      return "border-amber-400/50 bg-gradient-to-br from-amber-300 via-yellow-200 to-orange-100 shadow-[0_10px_28px_-10px_rgba(245,158,11,0.5)] dark:border-amber-500/35 dark:from-amber-600/80 dark:via-yellow-800/50 dark:to-orange-950/70 dark:shadow-[0_10px_28px_-10px_rgba(245,158,11,0.3)]";
    case "PENDING":
      return "border-rose-300/50 bg-gradient-to-br from-rose-300 via-pink-200 to-rose-100 shadow-[0_10px_28px_-10px_rgba(244,63,94,0.4)] dark:border-rose-500/35 dark:from-rose-700/75 dark:via-pink-900/50 dark:to-rose-950/70 dark:shadow-[0_10px_28px_-10px_rgba(244,63,94,0.28)]";
    case "DUE":
      return "border-orange-400/55 bg-gradient-to-br from-orange-400 via-orange-300 to-amber-200 shadow-[0_10px_28px_-10px_rgba(249,115,22,0.5)] dark:border-orange-500/40 dark:from-orange-700/85 dark:via-orange-800/55 dark:to-amber-950/70 dark:shadow-[0_10px_28px_-10px_rgba(249,115,22,0.35)]";
    case "OVERDUE":
      return "border-red-400/55 bg-gradient-to-br from-red-400 via-rose-300 to-orange-200 shadow-[0_10px_28px_-10px_rgba(239,68,68,0.5)] dark:border-red-500/40 dark:from-red-700/85 dark:via-rose-800/55 dark:to-orange-950/70 dark:shadow-[0_10px_28px_-10px_rgba(239,68,68,0.35)]";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function paymentTileInk(status: PaymentTileTone) {
  switch (status) {
    case "PAID":
      return {
        title: "text-emerald-950 dark:text-emerald-50",
        meta: "text-emerald-900/70 dark:text-emerald-100/70",
        chip: "bg-white/60 text-emerald-950 backdrop-blur-md dark:bg-black/25 dark:text-emerald-50",
        glow: "bg-white/55 dark:bg-emerald-200/20",
      };
    case "PARTIAL":
      return {
        title: "text-amber-950 dark:text-amber-50",
        meta: "text-amber-900/70 dark:text-amber-100/70",
        chip: "bg-white/60 text-amber-950 backdrop-blur-md dark:bg-black/25 dark:text-amber-50",
        glow: "bg-white/55 dark:bg-amber-200/20",
      };
    case "PENDING":
      return {
        title: "text-rose-950 dark:text-rose-50",
        meta: "text-rose-900/70 dark:text-rose-100/70",
        chip: "bg-white/60 text-rose-950 backdrop-blur-md dark:bg-black/25 dark:text-rose-50",
        glow: "bg-white/55 dark:bg-rose-200/20",
      };
    case "DUE":
      return {
        title: "text-orange-950 dark:text-orange-50",
        meta: "text-orange-900/75 dark:text-orange-100/75",
        chip: "bg-white/60 text-orange-950 backdrop-blur-md dark:bg-black/25 dark:text-orange-50",
        glow: "bg-white/50 dark:bg-orange-200/20",
      };
    case "OVERDUE":
      return {
        title: "text-red-950 dark:text-red-50",
        meta: "text-red-900/75 dark:text-red-100/75",
        chip: "bg-white/60 text-red-950 backdrop-blur-md dark:bg-black/25 dark:text-red-50",
        glow: "bg-white/50 dark:bg-red-200/20",
      };
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PAID: "Paid",
  PARTIAL: "Partial",
  PENDING: "Unpaid",
};

/** Payables have no customer payment term — unpaid is shown as due (orange). */
export function payableTileTone(status: PaymentStatus): PaymentTileTone {
  switch (status) {
    case "PENDING":
      return "DUE";
    case "PARTIAL":
    case "PAID":
      return status;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function paymentTileChipLabel(tone: PaymentTileTone, daysUntilDue?: number | null) {
  if (tone === "OVERDUE") return "Overdue";
  if (tone === "DUE") {
    if (daysUntilDue === 0) return "Due today";
    return "Due";
  }
  return PAYMENT_STATUS_LABEL[tone];
}
