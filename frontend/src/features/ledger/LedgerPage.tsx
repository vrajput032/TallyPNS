import { ChevronRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  balanceTone,
  customerInitial,
  formatLedgerBalance,
  formatLedgerDate,
} from "./ledgerUi";
import type { LedgerCustomerSummary } from "./types";
import { useLedgerList } from "./useLedger";

function SummaryStrip({
  billed,
  received,
  outstanding,
  isLoading,
  compact,
}: {
  billed: number;
  received: number;
  outstanding: number;
  isLoading: boolean;
  compact: boolean;
}) {
  const cells = [
    { label: "Billed", value: billed, tone: undefined },
    { label: "Received", value: received, tone: undefined },
    { label: "Due", value: outstanding, tone: balanceTone(outstanding) },
  ] as const;

  if (compact) {
    return (
      <div className="grid grid-cols-3 overflow-hidden rounded-2xl border bg-card shadow-sm">
        {cells.map((cell, index) => (
          <div
            key={cell.label}
            className={cn("px-3 py-3", index > 0 && "border-l")}
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {cell.label}
            </p>
            {isLoading ? (
              <Skeleton className="mt-1 h-5 w-16" />
            ) : (
              <p className={cn("mt-1 text-sm font-bold tabular-nums leading-tight", cell.tone)}>
                ₹{formatInr(cell.value)}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {cells.map((cell) => (
        <Card key={cell.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{cell.label}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold tabular-nums">
            {isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <span className={cell.tone}>{formatInr(cell.value)}</span>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function MobileCustomerList({
  customers,
  isLoading,
  onOpen,
}: {
  customers: LedgerCustomerSummary[];
  isLoading: boolean;
  onOpen: (id: string) => void;
}) {
  if (isLoading) return <CardListSkeleton cards={6} />;

  if (customers.length === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">No customers found.</p>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      {customers.map((row, index) => (
        <button
          key={row.id}
          type="button"
          onClick={() => onOpen(row.id)}
          className={cn(
            "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-muted/70",
            index > 0 && "border-t"
          )}
        >
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {customerInitial(row.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold leading-tight">{row.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {row.phone || "No phone"}
              {row.lastTransactionDate ? ` · ${formatLedgerDate(row.lastTransactionDate)}` : ""}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className={cn("text-sm font-bold tabular-nums leading-tight", balanceTone(row.closingBalance))}>
              ₹{formatLedgerBalance(row.closingBalance)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {row.entryCount === 1 ? "1 txn" : `${row.entryCount} txns`}
            </p>
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </button>
      ))}
    </div>
  );
}

export function LedgerPage() {
  const navigate = useNavigate();
  const isCompact = useIsCompactNav();
  const { data, isLoading } = useLedgerList();
  const [query, setQuery] = useState("");

  const customers = useMemo(() => {
    const rows = data?.customers ?? [];
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) => {
      const haystack = [row.name, row.phone ?? "", row.gstin ?? ""].join(" ").toLowerCase();
      return haystack.includes(needle);
    });
  }, [data?.customers, query]);

  return (
    <div className="grid gap-4">
      <PageHeader title="Ledger" backTo="/" backLabel="Back to Dashboard" />

      <SummaryStrip
        billed={data?.totalBilled ?? 0}
        received={data?.totalPaid ?? 0}
        outstanding={data?.totalClosingBalance ?? 0}
        isLoading={isLoading}
        compact={isCompact}
      />

      <div
        className={cn(
          isCompact && "sticky top-0 z-10 -mx-4 bg-background/90 px-4 py-2 backdrop-blur-md"
        )}
      >
        <div className={cn("relative", !isCompact && "max-w-sm")}>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search customers..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={cn("w-full pl-9", isCompact ? "h-11 rounded-xl text-base" : undefined)}
          />
        </div>
      </div>

      {isCompact ? (
        <MobileCustomerList
          customers={customers}
          isLoading={isLoading}
          onOpen={(id) => navigate(`/ledger/${id}`)}
        />
      ) : (
        <div className="min-w-0 rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Billed</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Last txn</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeletonRows columns={6} />
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No customers found.
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/ledger/${row.id}`)}
                  >
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{row.phone || "—"}</TableCell>
                    <TableCell className="text-right">{formatInr(row.totalBilled)}</TableCell>
                    <TableCell className="text-right">{formatInr(row.totalPaid)}</TableCell>
                    <TableCell className={cn("text-right", balanceTone(row.closingBalance))}>
                      {formatInr(row.closingBalance)}
                    </TableCell>
                    <TableCell>{formatLedgerDate(row.lastTransactionDate)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
