import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatInr } from "@/lib/formatInr";
import type { RunningCostMonth } from "./types";
import { useRunningCosts } from "./usePurchase";

function MonthCard({ month, defaultOpen }: { month: RunningCostMonth; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = open ? ChevronDown : ChevronRight;

  return (
    <Card className="min-w-0 overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flex items-center gap-2 font-semibold">
          <Icon className="size-4 text-muted-foreground" />
          {month.label}
        </span>
        <span className="text-right">
          <span className="block text-lg font-bold tabular-nums">₹{formatInr(month.total)}</span>
          <span className="block text-xs text-muted-foreground">
            P&amp;L ₹{formatInr(month.pnlTotal)} · Entries ₹{formatInr(month.entriesTotal)}
          </span>
        </span>
      </button>
      {open ? (
        <CardContent className="grid gap-4 border-t pt-4 text-sm">
          <div className="grid gap-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Counted in Profit &amp; Loss
            </p>
            {month.pnlLines.map((line) => (
              <div key={line.id} className="flex justify-between gap-2">
                <span>{line.label}</span>
                <span className="tabular-nums">₹{formatInr(line.amount)}</span>
              </div>
            ))}
          </div>
          <div className="grid gap-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Running cost entries
            </p>
            {month.entries.length === 0 ? (
              <p className="text-muted-foreground">No entries this month.</p>
            ) : (
              month.entries.map((entry) => (
                <Link
                  key={entry.id}
                  to={`/purchase/${entry.id}`}
                  className="flex justify-between gap-2 rounded-sm hover:bg-muted/60"
                >
                  <span className="min-w-0 truncate">
                    {entry.title?.trim() || entry.billNo}
                    <span className="text-muted-foreground">
                      {" "}
                      · {new Date(entry.billDate).toLocaleDateString("en-GB")}
                    </span>
                  </span>
                  <span className="tabular-nums">₹{formatInr(entry.totalAmount)}</span>
                </Link>
              ))
            )}
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}

export function MonthlyRunningCostsPanel() {
  const { data, isLoading } = useRunningCosts();

  if (isLoading && !data) {
    return (
      <div className="grid gap-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="grid gap-3">
      <div className="grid min-w-0 grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: "In P&L", value: data.totals.pnl },
          { label: "Entries", value: data.totals.entries },
          { label: "Total", value: data.totals.combined },
        ].map((stat) => (
          <Card key={stat.label} className="min-w-0 overflow-hidden">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground sm:text-sm">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent className="truncate text-sm font-semibold tabular-nums sm:text-xl">
              ₹{formatInr(stat.value)}
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        &quot;In P&amp;L&quot; is rent, salary, electricity, thekedar, delivery and partner expenses
        already used in <Link to="/profit-loss" className="text-primary underline-offset-2 hover:underline">Profit &amp; Loss</Link>.
        Entries are extra running-cost bills added here; they are not in P&amp;L yet.
      </p>
      {data.months.map((month, index) => (
        <MonthCard key={month.key} month={month} defaultOpen={index === 0} />
      ))}
    </div>
  );
}
