import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardListSkeleton, TableSkeletonRows } from "@/components/loading/PageSkeletons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIsCompactNav } from "@/hooks/useIsMobile";
import { formatInr } from "@/lib/formatInr";
import { cn } from "@/lib/utils";
import { useActivity } from "./useActivity";
import {
  activityActionLabel,
  activityModuleLabel,
  formatActivityActor,
  type ActivityLog,
  type ActivityModule,
} from "./types";

type FilterId = "ALL" | ActivityModule;

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "SALES", label: "Sales" },
  { id: "PURCHASE", label: "Purchase" },
  { id: "RAW_MATERIAL", label: "Raw material" },
  { id: "INVENTORY", label: "Inventory" },
  { id: "PAYMENT", label: "Payments" },
];

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function moduleBadgeClass(module: ActivityModule): string {
  switch (module) {
    case "SALES":
      return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
    case "PURCHASE":
      return "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200";
    case "RAW_MATERIAL":
      return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200";
    case "INVENTORY":
      return "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-200";
    case "PAYMENT":
      return "border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-200";
    default: {
      const _exhaustive: never = module;
      return _exhaustive;
    }
  }
}

function emptyMessage(filter: FilterId) {
  if (filter === "ALL") {
    return "No activity recorded yet. New bills, payments, and stock changes will show up here.";
  }
  const label = FILTERS.find((item) => item.id === filter)?.label.toLowerCase() ?? "matching";
  return `No ${label} activity yet.`;
}

function FilterBar({
  value,
  onChange,
  compact,
}: {
  value: FilterId;
  onChange: (id: FilterId) => void;
  compact: boolean;
}) {
  return (
    <div className={cn("flex gap-1.5 overflow-x-auto pb-1", compact ? "px-0" : "flex-wrap")}>
      {FILTERS.map((filter) => (
        <Button
          key={filter.id}
          type="button"
          size="sm"
          variant={value === filter.id ? "default" : "outline"}
          className="shrink-0"
          onClick={() => onChange(filter.id)}
        >
          {filter.label}
        </Button>
      ))}
    </div>
  );
}

function ActivityCards({
  rows,
  isLoading,
  emptyText,
  onOpen,
}: {
  rows: ActivityLog[];
  isLoading: boolean;
  emptyText: string;
  onOpen: (row: ActivityLog) => void;
}) {
  if (isLoading) return <CardListSkeleton cards={5} />;
  if (rows.length === 0) {
    return (
      <div className="rounded-md border bg-card p-8 text-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {rows.map((row) => (
        <button
          key={row.id}
          type="button"
          onClick={() => onOpen(row)}
          disabled={!row.href}
          className={cn(
            "rounded-2xl border bg-card p-4 text-left shadow-sm transition-all",
            row.href
              ? "active:scale-[0.99] active:bg-muted/60"
              : "cursor-default opacity-90"
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <Badge variant="outline" className={moduleBadgeClass(row.module)}>
              {activityModuleLabel(row.module)}
            </Badge>
            <span className="shrink-0 text-xs text-muted-foreground">{formatWhen(row.createdAt)}</span>
          </div>
          <p className="mt-2 font-medium leading-snug">{row.summary}</p>
          <div className="mt-2 flex items-center justify-between gap-2 text-sm text-muted-foreground">
            <span className="min-w-0 truncate">
              {formatActivityActor(row.actorName, row.deviceName)}
            </span>
            {row.amount != null ? (
              <span className="font-semibold tabular-nums text-foreground">₹{formatInr(row.amount)}</span>
            ) : null}
          </div>
        </button>
      ))}
    </div>
  );
}

export function ActivityPage() {
  const { data, isLoading, isError, error } = useActivity();
  const [filter, setFilter] = useState<FilterId>("ALL");
  const isCompactNav = useIsCompactNav();
  const navigate = useNavigate();

  const rows = useMemo(() => {
    if (filter === "ALL") return data;
    return data.filter((row) => row.module === filter);
  }, [data, filter]);

  function openRow(row: ActivityLog) {
    if (row.href) navigate(row.href);
  }

  return (
    <div className="grid min-w-0 gap-4">
      <PageHeader title="Activity" backTo="/" backLabel="Back to Dashboard" />
      <p className="text-sm text-muted-foreground">
        Latest bills, payments, and stock changes across the app.
      </p>
      <FilterBar value={filter} onChange={setFilter} compact={isCompactNav} />

      {isError ? (
        <div className="rounded-md border bg-card p-8 text-center text-sm text-destructive">
          {error ?? "Failed to load activity"}
        </div>
      ) : isCompactNav ? (
        <ActivityCards rows={rows} isLoading={isLoading} emptyText={emptyMessage(filter)} onOpen={openRow} />
      ) : isLoading ? (
        <div className="min-w-0 overflow-x-auto rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Who</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableSkeletonRows rows={8} columns={5} />
            </TableBody>
          </Table>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-md border bg-card p-8 text-center text-sm text-muted-foreground">
          {emptyMessage(filter)}
        </div>
      ) : (
        <div className="min-w-0 overflow-x-auto rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Who</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={row.href ? "cursor-pointer" : undefined}
                  onClick={() => openRow(row)}
                >
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatWhen(row.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="font-medium">{row.actorName}</p>
                      {row.deviceName ? (
                        <p className="truncate text-xs text-muted-foreground">{row.deviceName}</p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={moduleBadgeClass(row.module)}>
                      {activityModuleLabel(row.module)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="min-w-0">
                      <p>{row.summary}</p>
                      <p className="text-xs text-muted-foreground">{activityActionLabel(row.action)}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.amount != null ? `₹${formatInr(row.amount)}` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
