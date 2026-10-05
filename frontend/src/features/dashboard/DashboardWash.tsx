import { cn } from "@/lib/utils";

export type DashboardTint =
  | "sky"
  | "mint"
  | "lilac"
  | "peach"
  | "gold"
  | "rose"
  | "orange"
  | "teal";

const WASH: Record<DashboardTint, string> = {
  sky: "bg-gradient-to-br from-sky-300/40 via-sky-100/20 to-transparent dark:from-sky-500/20 dark:via-sky-900/10 dark:to-transparent",
  mint: "bg-gradient-to-br from-emerald-300/40 via-teal-100/20 to-transparent dark:from-emerald-500/20 dark:via-teal-900/10 dark:to-transparent",
  lilac: "bg-gradient-to-br from-violet-300/40 via-fuchsia-100/15 to-transparent dark:from-violet-500/20 dark:via-fuchsia-900/10 dark:to-transparent",
  peach: "bg-gradient-to-br from-orange-300/35 via-amber-100/20 to-transparent dark:from-orange-500/20 dark:via-amber-900/10 dark:to-transparent",
  gold: "bg-gradient-to-br from-amber-300/40 via-yellow-100/20 to-transparent dark:from-amber-500/20 dark:via-yellow-900/10 dark:to-transparent",
  rose: "bg-gradient-to-br from-rose-300/40 via-pink-100/20 to-transparent dark:from-rose-500/20 dark:via-pink-900/10 dark:to-transparent",
  orange: "bg-gradient-to-br from-orange-400/35 via-orange-100/15 to-transparent dark:from-orange-500/22 dark:via-orange-900/10 dark:to-transparent",
  teal: "bg-gradient-to-br from-teal-300/40 via-cyan-100/15 to-transparent dark:from-teal-500/20 dark:via-cyan-900/10 dark:to-transparent",
};

const GLOW: Record<DashboardTint, string> = {
  sky: "bg-sky-200/45 dark:bg-sky-400/15",
  mint: "bg-emerald-200/45 dark:bg-emerald-400/15",
  lilac: "bg-violet-200/45 dark:bg-violet-400/15",
  peach: "bg-orange-200/40 dark:bg-orange-400/15",
  gold: "bg-amber-200/45 dark:bg-amber-400/15",
  rose: "bg-rose-200/45 dark:bg-rose-400/15",
  orange: "bg-orange-200/45 dark:bg-orange-400/15",
  teal: "bg-teal-200/45 dark:bg-teal-400/15",
};

export function DashboardWash({ tint }: { tint: DashboardTint }) {
  return (
    <>
      <div className={cn("pointer-events-none absolute inset-0", WASH[tint])} />
      <div
        className={cn(
          "pointer-events-none absolute -right-8 -top-10 size-24 rounded-full blur-2xl",
          GLOW[tint]
        )}
      />
    </>
  );
}

export const STOCK_TINT: Record<number, DashboardTint> = {
  95: "sky",
  110: "mint",
  90: "peach",
  55: "lilac",
  85: "gold",
  70: "rose",
  82: "teal",
};
