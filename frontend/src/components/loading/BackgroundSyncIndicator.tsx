import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BackgroundSyncState } from "@/store/coldStartStore";

type ActiveSyncState = Exclude<BackgroundSyncState, "idle">;

type SyncVariant = "inline" | "pill";

function syncMessage(state: ActiveSyncState, variant: SyncVariant) {
  switch (state) {
    case "waking":
      return variant === "inline"
        ? "Server waking · loading in background"
        : "Server waking up · loading data in background";
    case "refreshing":
      return "Loading data in background";
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

export function BackgroundSyncIndicator({
  state,
  variant,
  className,
}: {
  state: ActiveSyncState;
  variant: SyncVariant;
  className?: string;
}) {
  const waking = state === "waking";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex min-w-0 items-center gap-1.5 font-medium",
        variant === "inline" ? "text-[11px]" : "text-xs",
        variant === "pill" && "rounded-full border px-3 py-1.5 shadow-sm backdrop-blur-md",
        variant === "pill" &&
          (waking
            ? "border-amber-400/50 bg-amber-100/80 text-amber-950 dark:bg-amber-500/15 dark:text-amber-100"
            : "border-border/60 bg-card/80 text-muted-foreground"),
        variant === "inline" && (waking ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground"),
        className
      )}
    >
      <Loader2 className="size-3.5 shrink-0 animate-spin" />
      <span className="truncate">{syncMessage(state, variant)}</span>
    </div>
  );
}
