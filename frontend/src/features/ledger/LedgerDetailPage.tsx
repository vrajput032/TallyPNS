import { ChevronRight, Download, Link as LinkIcon } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
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
  isPaymentEntry,
  kindLabel,
  ledgerDocumentPath,
  ledgerListPath,
  ledgerPath,
  moneyOrBlank,
  type LedgerParty,
} from "./ledgerUi";
import type { LedgerEntry } from "./types";
import {
  useLedgerList,
  usePartyLedger,
  useSupplierLedgerList,
  type PartyLedgerView,
} from "./useLedger";

function entryAmountClass(entry: LedgerEntry) {
  if (isPaymentEntry(entry.kind)) return "text-emerald-700 dark:text-emerald-400";
  if (entry.kind === "OPENING") return undefined;
  return "text-red-600 dark:text-red-400";
}

function entryAmount(entry: LedgerEntry) {
  return `₹${formatInr(Math.max(entry.debit, entry.credit))}`;
}

function notFoundLabel(party: LedgerParty) {
  return party === "SUPPLIER" ? "Supplier not found." : "Customer not found.";
}

function AllocationList({
  entry,
  party,
  linked,
}: {
  entry: LedgerEntry;
  party: LedgerParty;
  linked: boolean;
}) {
  if (entry.allocations.length < 2) return null;
  return (
    <ul className="mt-1 grid gap-0.5 text-xs text-muted-foreground">
      {entry.allocations.map((allocation) => (
        <li key={allocation.voucherNo} className="tabular-nums">
          {linked ? (
            <Link
              to={ledgerDocumentPath(party, allocation.documentId)}
              className="text-primary hover:underline"
            >
              {allocation.documentNo}
            </Link>
          ) : (
            allocation.documentNo
          )}
          {` · ${allocation.voucherNo} · ₹${formatInr(allocation.amount)}`}
        </li>
      ))}
    </ul>
  );
}

function MobileLedgerDetail({
  party,
  data,
  isLoading,
  isError,
}: {
  party: LedgerParty;
  data: PartyLedgerView | undefined;
  isLoading: boolean;
  isError: boolean;
}) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <CardListSkeleton cards={5} />
      </div>
    );
  }

  if (isError || !data) {
    return <p className="py-16 text-center text-sm text-muted-foreground">{notFoundLabel(party)}</p>;
  }

  return (
    <div className="grid gap-4">
      <div className="overflow-hidden rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
            {customerInitial(data.name)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold leading-tight">{data.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {data.contactParts.join(" · ") || "No contact details"}
            </p>
          </div>
        </div>
        <p className="mt-4 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {party === "SUPPLIER" ? "Payable" : "Closing balance"}
        </p>
        <p
          className={cn(
            "text-3xl font-bold tabular-nums tracking-tight",
            balanceTone(data.closingBalance, party)
          )}
        >
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
        <Button className="mt-4 w-full" onClick={() => navigate(`${ledgerPath(party, data.id)}/print`)}>
          <Download className="size-4" />
          Download ledger
        </Button>
      </div>

      {data.entries.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No transactions yet.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          {data.entries.map((entry, index) => {
            const documentId = entry.documentId;
            const rowClass = cn(
              "flex w-full items-center gap-3 px-4 py-3 text-left",
              index > 0 && "border-t",
              documentId && "transition-colors active:bg-muted/70"
            );
            const body = (
              <>
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                    isPaymentEntry(entry.kind)
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
                  <AllocationList entry={entry} party={party} linked={false} />
                </div>
                <div className="shrink-0 text-right">
                  <p className={cn("text-sm font-bold tabular-nums leading-tight", entryAmountClass(entry))}>
                    {entryAmount(entry)}
                  </p>
                  <p className="text-[11px] tabular-nums text-muted-foreground">
                    {formatLedgerBalance(entry.balance)}
                  </p>
                </div>
                {documentId ? <ChevronRight className="size-4 shrink-0 text-muted-foreground" /> : null}
              </>
            );

            if (documentId) {
              return (
                <button
                  key={`${entry.kind}-${entry.id}`}
                  type="button"
                  className={rowClass}
                  onClick={() => navigate(ledgerDocumentPath(party, documentId))}
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

function entryVoucher(entry: LedgerEntry, party: LedgerParty) {
  if (entry.documentId) {
    return (
      <Link
        to={ledgerDocumentPath(party, entry.documentId)}
        className="inline-flex items-center gap-1 text-primary hover:underline"
      >
        <LinkIcon className="size-3" />
        {entry.voucherNo}
      </Link>
    );
  }
  return entry.voucherNo || "—";
}

function PartySwitcher({ party, partyId }: { party: LedgerParty; partyId: string | undefined }) {
  const navigate = useNavigate();
  const { data: customerList } = useLedgerList();
  const { data: supplierList } = useSupplierLedgerList();

  const options =
    party === "SUPPLIER"
      ? (supplierList?.suppliers ?? []).map((row) => ({ id: row.key, name: row.name }))
      : (customerList?.customers ?? []).map((row) => ({ id: row.id, name: row.name }));

  if (options.length === 0) return null;

  return (
    <label className="grid max-w-sm gap-1 text-sm">
      <span className="text-muted-foreground">{party === "SUPPLIER" ? "Supplier" : "Customer"}</span>
      <select
        className="h-9 rounded-lg border bg-background px-3"
        value={partyId ?? ""}
        onChange={(e) => navigate(ledgerPath(party, e.target.value))}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export function LedgerDetailPage({ party = "CUSTOMER" }: { party?: LedgerParty }) {
  const params = useParams();
  const partyId = party === "SUPPLIER" ? params.partyId : params.customerId;
  const navigate = useNavigate();
  const isCompact = useIsCompactNav();
  const { data, isLoading, isError } = usePartyLedger(party, partyId);

  if (isCompact) {
    return <MobileLedgerDetail party={party} data={data} isLoading={isLoading} isError={isError} />;
  }

  const title = data?.name ?? (party === "SUPPLIER" ? "Supplier ledger" : "Customer ledger");

  return (
    <div className="grid gap-4">
      <PageHeader
        title={title}
        backTo={ledgerListPath(party)}
        backLabel="Back to Ledger"
        actions={
          data ? (
            <Button variant="outline" onClick={() => navigate(`${ledgerPath(party, data.id)}/print`)}>
              <Download className="size-4" />
              Download ledger
            </Button>
          ) : null
        }
      />

      <PartySwitcher party={party} partyId={partyId} />

      {data ? (
        <div className="grid gap-0.5 text-sm text-muted-foreground">
          <p>{data.contactParts.join(" · ") || "No contact details"}</p>
          {data.aliases.length > 0 ? (
            <p className="text-xs">Also billed as: {data.aliases.join(", ")}</p>
          ) : null}
        </div>
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
              {party === "SUPPLIER" ? "Payable" : "Closing Balance"}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <span className={balanceTone(data?.closingBalance ?? 0, party)}>
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
                  {notFoundLabel(party)}
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
                  <TableCell className="align-top">{formatLedgerDate(entry.date)}</TableCell>
                  <TableCell className="align-top">{kindLabel(entry.kind)}</TableCell>
                  <TableCell className="whitespace-normal">
                    {entry.particulars}
                    <AllocationList entry={entry} party={party} linked />
                  </TableCell>
                  <TableCell className="align-top">{entryVoucher(entry, party)}</TableCell>
                  <TableCell className="text-right align-top">{moneyOrBlank(entry.debit)}</TableCell>
                  <TableCell className="text-right align-top">{moneyOrBlank(entry.credit)}</TableCell>
                  <TableCell className={cn("text-right align-top", balanceTone(entry.balance, party))}>
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
