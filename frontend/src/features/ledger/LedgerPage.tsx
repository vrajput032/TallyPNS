import { ChevronRight, Download, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ledgerPath,
  type LedgerParty,
} from "./ledgerUi";
import { useLedgerList, useSupplierLedgerList } from "./useLedger";

/** Customer or supplier list row in one shape for the tables below. */
interface PartyRow {
  id: string;
  name: string;
  subtitle: string;
  searchText: string;
  totalBilled: number;
  totalPaid: number;
  closingBalance: number;
  /** Amount still outstanding as a positive number, for either side. */
  due: number;
  entryCount: number;
  lastTransactionDate: string | null;
}

function parseLedgerTab(value: string | null): LedgerParty {
  return value === "suppliers" ? "SUPPLIER" : "CUSTOMER";
}

function SummaryStrip({
  party,
  billed,
  received,
  outstanding,
  isLoading,
  compact,
}: {
  party: LedgerParty;
  billed: number;
  received: number;
  outstanding: number;
  isLoading: boolean;
  compact: boolean;
}) {
  const cells = [
    { label: "Billed", value: billed, tone: undefined },
    { label: party === "SUPPLIER" ? "Paid" : "Received", value: received, tone: undefined },
    {
      label: party === "SUPPLIER" ? "Payable" : "Due",
      value: outstanding,
      tone: balanceTone(outstanding),
    },
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

function MobilePartyList({
  party,
  rows: customers,
  isLoading,
  onOpen,
  onDownload,
}: {
  party: LedgerParty;
  rows: PartyRow[];
  isLoading: boolean;
  onOpen: (id: string) => void;
  onDownload: (id: string) => void;
}) {
  if (isLoading) return <CardListSkeleton cards={6} />;

  if (customers.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        {party === "SUPPLIER" ? "No suppliers found." : "No customers found."}
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      {customers.map((row, index) => (
        <div
          key={row.id}
          className={cn("flex items-center gap-1 pr-1", index > 0 && "border-t")}
        >
          <button
            type="button"
            onClick={() => onOpen(row.id)}
            className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left transition-colors active:bg-muted/70"
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {customerInitial(row.name)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold leading-tight">{row.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {row.subtitle}
                {row.lastTransactionDate ? ` · ${formatLedgerDate(row.lastTransactionDate)}` : ""}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className={cn("text-sm font-bold tabular-nums leading-tight", balanceTone(row.closingBalance, party))}>
                ₹{formatLedgerBalance(row.closingBalance)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {row.entryCount === 1 ? "1 txn" : `${row.entryCount} txns`}
              </p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Download ledger for ${row.name}`}
            onClick={() => onDownload(row.id)}
          >
            <Download className="size-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}

export function LedgerPage() {
  const navigate = useNavigate();
  const isCompact = useIsCompactNav();
  const [searchParams, setSearchParams] = useSearchParams();
  const party = parseLedgerTab(searchParams.get("tab"));
  const customerList = useLedgerList();
  const supplierList = useSupplierLedgerList();
  const [query, setQuery] = useState("");

  const active = party === "SUPPLIER" ? supplierList : customerList;
  const isLoading = active.isLoading;

  const allRows = useMemo<PartyRow[]>(() => {
    if (party === "SUPPLIER") {
      return (supplierList.data?.suppliers ?? []).map((row) => ({
        id: row.key,
        name: row.name,
        subtitle:
          row.gstin || (row.billCount === 1 ? "1 raw material bill" : `${row.billCount} raw material bills`),
        searchText: [row.name, row.gstin ?? ""].join(" "),
        totalBilled: row.totalBilled,
        totalPaid: row.totalPaid,
        closingBalance: row.closingBalance,
        due: -row.closingBalance,
        entryCount: row.entryCount,
        lastTransactionDate: row.lastTransactionDate,
      }));
    }
    return (customerList.data?.customers ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      subtitle: row.phone || "No phone",
      searchText: [row.name, row.phone ?? "", row.gstin ?? ""].join(" "),
      totalBilled: row.totalBilled,
      totalPaid: row.totalPaid,
      closingBalance: row.closingBalance,
      due: row.closingBalance,
      entryCount: row.entryCount,
      lastTransactionDate: row.lastTransactionDate,
    }));
  }, [party, customerList.data?.customers, supplierList.data?.suppliers]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return allRows;
    return allRows.filter((row) => row.searchText.toLowerCase().includes(needle));
  }, [allRows, query]);

  const totals =
    party === "SUPPLIER"
      ? {
          billed: supplierList.data?.totalBilled ?? 0,
          received: supplierList.data?.totalPaid ?? 0,
          outstanding: -(supplierList.data?.totalClosingBalance ?? 0),
        }
      : {
          billed: customerList.data?.totalBilled ?? 0,
          received: customerList.data?.totalPaid ?? 0,
          outstanding: customerList.data?.totalClosingBalance ?? 0,
        };

  const openPath = (id: string) => ledgerPath(party, id);
  const partyNoun = party === "SUPPLIER" ? "suppliers" : "customers";

  return (
    <div className="grid gap-4">
      <PageHeader title="Ledger" backTo="/" backLabel="Back to Dashboard" />

      <Tabs
        value={party}
        onValueChange={(value) => {
          setQuery("");
          setSearchParams(value === "SUPPLIER" ? { tab: "suppliers" } : {});
        }}
      >
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="CUSTOMER" className="flex-1 sm:flex-none">
            Customers
          </TabsTrigger>
          <TabsTrigger value="SUPPLIER" className="flex-1 sm:flex-none">
            Raw material suppliers
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <SummaryStrip
        party={party}
        billed={totals.billed}
        received={totals.received}
        outstanding={totals.outstanding}
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
            placeholder={`Search ${partyNoun}...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={cn("w-full pl-9", isCompact ? "h-11 rounded-xl text-base" : undefined)}
          />
        </div>
      </div>

      {isCompact ? (
        <MobilePartyList
          party={party}
          rows={rows}
          isLoading={isLoading}
          onOpen={(id) => navigate(openPath(id))}
          onDownload={(id) => navigate(`${openPath(id)}/print`)}
        />
      ) : (
        <div className="min-w-0 rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{party === "SUPPLIER" ? "Supplier" : "Customer"}</TableHead>
                <TableHead>{party === "SUPPLIER" ? "GSTIN / bills" : "Phone"}</TableHead>
                <TableHead className="text-right">Billed</TableHead>
                <TableHead className="text-right">{party === "SUPPLIER" ? "Paid" : "Received"}</TableHead>
                <TableHead className="text-right">{party === "SUPPLIER" ? "Payable" : "Balance"}</TableHead>
                <TableHead>Last txn</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeletonRows columns={7} />
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No {partyNoun} found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => navigate(openPath(row.id))}
                  >
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell>{row.subtitle}</TableCell>
                    <TableCell className="text-right">{formatInr(row.totalBilled)}</TableCell>
                    <TableCell className="text-right">{formatInr(row.totalPaid)}</TableCell>
                    <TableCell className={cn("text-right", balanceTone(row.due))}>
                      {formatInr(row.due)}
                    </TableCell>
                    <TableCell>{formatLedgerDate(row.lastTransactionDate)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Download ledger for ${row.name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`${openPath(row.id)}/print`);
                        }}
                      >
                        <Download className="size-4" />
                      </Button>
                    </TableCell>
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
