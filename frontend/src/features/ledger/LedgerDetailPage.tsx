import { ChevronRight, Link as LinkIcon } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  kindLabel,
  moneyOrBlank,
} from "./ledgerUi";
import type { LedgerEntry } from "./types";
import { useCustomerLedger, useLedgerList } from "./useLedger";

function entryAmountClass(entry: LedgerEntry) {
  if (entry.kind === "RECEIPT") return "text-emerald-700 dark:text-emerald-400";
  if (entry.debit > 0.009) return "text-red-600 dark:text-red-400";
  return undefined;
}

function entryAmount(entry: LedgerEntry) {
  if (entry.credit > 0.009) return `+₹${formatInr(entry.credit)}`;
  if (entry.debit > 0.009) return `₹${formatInr(entry.debit)}`;
  return "₹0.00";
}

function MobileLedgerDetail({
  data,
  isLoading,
  isError,
}: {
  data: ReturnType<typeof useCustomerLedger>["data"];
  isLoading: boolean;
  isError: boolean;
}) {
  const navigate = useNavigate();
  const customer = data?.customer;

  if (isLoading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <CardListSkeleton cards={5} />
      </div>
    );
  }

  if (isError || !data || !customer) {
    return <p className="py-16 text-center text-sm text-muted-foreground">Customer not found.</p>;
  }

  return (
    <div className="grid gap-4">
      <div className="overflow-hidden rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
            {customerInitial(customer.name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold leading-tight">{customer.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {[customer.phone, customer.gstin].filter(Boolean).join(" · ") || "No contact details"}
            </p>
          </div>
        </div>
        <p className="mt-4 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Closing balance
        </p>
        <p className={cn("text-3xl font-bold tabular-nums tracking-tight", balanceTone(data.closingBalance))}>
          ₹{formatLedgerBalance(data.closingBalance)}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-muted/70 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Debit</p>
            <p className="text-sm font-semibold tabular-nums">₹{formatInr(data.totalDebit)}</p>
          </div>
          <div className="rounded-xl bg-muted/70 px-3 py-2">
            <p className="text-[11px] text-muted-foreground">Credit</p>
            <p className="text-sm font-semibold tabular-nums">₹{formatInr(data.totalCredit)}</p>
          </div>
        </div>
      </div>

      {data.entries.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No transactions yet.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          {data.entries.map((entry, index) => {
            const canOpen = Boolean(entry.salesInvoiceId);
            const rowClass = cn(
              "flex w-full items-center gap-3 px-4 py-3 text-left",
              index > 0 && "border-t",
              canOpen && "transition-colors active:bg-muted/70"
            );
            const body = (
              <>
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                    entry.kind === "RECEIPT"
                      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                      : "bg-primary/10 text-primary"
                  )}
                >
                  {kindLabel(entry.kind).slice(0, 3).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium leading-tight">{entry.particulars}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatLedgerDate(entry.date)}
                    {entry.voucherNo ? ` · ${entry.voucherNo}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={cn("text-sm font-bold tabular-nums leading-tight", entryAmountClass(entry))}>
                    {entryAmount(entry)}
                  </p>
                  <p className="text-[11px] tabular-nums text-muted-foreground">
                    {formatLedgerBalance(entry.balance)}
                  </p>
                </div>
                {canOpen ? <ChevronRight className="size-4 shrink-0 text-muted-foreground" /> : null}
              </>
            );

            if (canOpen) {
              return (
                <button
                  key={`${entry.kind}-${entry.id}`}
                  type="button"
                  className={rowClass}
                  onClick={() => navigate(`/sales/${entry.salesInvoiceId}`)}
                >
                  {body}
                </button>
              );
            }

            return (
              <div key={`${entry.kind}-${entry.id}`} className={rowClass}>
                {body}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function entryVoucher(entry: LedgerEntry) {
  if (entry.salesInvoiceId && (entry.kind === "INVOICE" || entry.kind === "RECEIPT")) {
    return (
      <Link to={`/sales/${entry.salesInvoiceId}`} className="inline-flex items-center gap-1 text-primary hover:underline">
        <LinkIcon className="size-3" />
        {entry.voucherNo}
      </Link>
    );
  }
  return entry.voucherNo || "—";
}

export function LedgerDetailPage() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const isCompact = useIsCompactNav();
  const { data: list } = useLedgerList();
  const { data, isLoading, isError } = useCustomerLedger(customerId);

  const title = data?.customer.name ?? "Customer ledger";

  if (isCompact) {
    return <MobileLedgerDetail data={data} isLoading={isLoading} isError={isError} />;
  }

  return (
    <div className="grid gap-4">
      <PageHeader title={title} backTo="/ledger" backLabel="Back to Ledger" />

      {list && list.customers.length > 0 ? (
        <label className="grid max-w-sm gap-1 text-sm">
          <span className="text-muted-foreground">Customer</span>
          <select
            className="h-9 rounded-lg border bg-background px-3"
            value={customerId ?? ""}
            onChange={(e) => navigate(`/ledger/${e.target.value}`)}
          >
            {list.customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {data?.customer ? (
        <p className="text-sm text-muted-foreground">
          {[data.customer.phone, data.customer.gstin, data.customer.address]
            .filter(Boolean)
            .join(" · ") || "No contact details"}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Debit</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {isLoading ? <Skeleton className="h-8 w-28" /> : formatInr(data?.totalDebit ?? 0)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Credit</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {isLoading ? <Skeleton className="h-8 w-28" /> : formatInr(data?.totalCredit ?? 0)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Closing Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <span className={balanceTone(data?.closingBalance ?? 0)}>
                {formatLedgerBalance(data?.closingBalance ?? 0)}
              </span>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="min-w-0 rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Particulars</TableHead>
              <TableHead>Voucher</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeletonRows columns={7} />
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Customer not found.
                </TableCell>
              </TableRow>
            ) : (data?.entries.length ?? 0) === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No transactions yet.
                </TableCell>
              </TableRow>
            ) : (
              data?.entries.map((entry) => (
                <TableRow key={`${entry.kind}-${entry.id}`}>
                  <TableCell>{formatLedgerDate(entry.date)}</TableCell>
                  <TableCell>{kindLabel(entry.kind)}</TableCell>
                  <TableCell>{entry.particulars}</TableCell>
                  <TableCell>{entryVoucher(entry)}</TableCell>
                  <TableCell className="text-right">{moneyOrBlank(entry.debit)}</TableCell>
                  <TableCell className="text-right">{moneyOrBlank(entry.credit)}</TableCell>
                  <TableCell className={cn("text-right", balanceTone(entry.balance))}>
                    {formatLedgerBalance(entry.balance)}
                  </TableCell>
                </TableRow>
              ))
            )}
            {data && data.entries.length > 0 ? (
              <TableRow className="font-semibold">
                <TableCell colSpan={4}>Total</TableCell>
                <TableCell className="text-right">{formatInr(data.totalDebit)}</TableCell>
                <TableCell className="text-right">{formatInr(data.totalCredit)}</TableCell>
                <TableCell className="text-right">{formatLedgerBalance(data.closingBalance)}</TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
