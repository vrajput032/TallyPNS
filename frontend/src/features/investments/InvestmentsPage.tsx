import { Loader2, Plus, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeletonRows } from "@/components/loading/PageSkeletons";
import { formatInr } from "@/lib/formatInr";
import { purchaseBillTitle, type PurchaseBill } from "@/features/purchase/types";
import { useInvestments } from "./useInvestments";
import type { InvestmentExpense } from "./types";

function formatDay(value: string) {
  const day = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleDateString("en-GB");
    return value;
  }
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { timeZone: "UTC" });
}

function SummaryCards({
  bills,
  expenses,
  combined,
  isLoading,
}: {
  bills: number;
  expenses: number;
  combined: number;
  isLoading: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">GST bills</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-8 w-24" /> : <div className="text-2xl font-semibold">{formatInr(bills)}</div>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">pns-expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="text-2xl font-semibold">{formatInr(expenses)}</div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Combined</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="text-2xl font-semibold">{formatInr(combined)}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BillsTable({ bills, isLoading }: { bills: PurchaseBill[] | undefined; isLoading: boolean }) {
  const navigate = useNavigate();
  const rows = bills ?? [];
  return (
    <div className="min-w-0 rounded-md border bg-card">
      <div className="border-b px-4 py-2 font-medium">Purchase bills</div>
      <p className="px-4 pt-2 text-xs text-muted-foreground">
        Machines, tools, and other one-time buys entered in Purchase. Open a row to see the attached invoice.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Invoice</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeletonRows columns={4} rows={5} />
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                No investment bills yet.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((bill) => (
              <TableRow
                key={bill.id}
                className="cursor-pointer"
                onClick={() => navigate(`/purchase/${bill.id}`)}
              >
                <TableCell className="whitespace-nowrap">{formatDay(bill.billDate)}</TableCell>
                <TableCell>
                  <div>{purchaseBillTitle(bill)}</div>
                  <div className="text-xs text-muted-foreground">
                    {bill.vendor?.name ?? bill.supplierGstin ?? "—"}
                  </div>
                </TableCell>
                <TableCell>{bill.supplierInvoiceNo?.trim() || bill.billNo}</TableCell>
                <TableCell className="text-right">{formatInr(bill.totalAmount)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function ExpensesTable({
  rows,
  fetchedAt,
  isLoading,
}: {
  rows: InvestmentExpense[] | undefined;
  fetchedAt: string | null | undefined;
  isLoading: boolean;
}) {
  const list = rows ?? [];
  return (
    <div className="min-w-0 rounded-md border bg-card">
      <div className="border-b px-4 py-2 font-medium">From pns-expenses</div>
      <p className="px-4 pt-2 text-xs text-muted-foreground">
        {isLoading
          ? "Pulling the latest pns-expenses…"
          : fetchedAt
            ? `Last pulled ${new Date(fetchedAt).toLocaleString("en-GB")}. Hindi / Hinglish notes (CNC, traub, mashin, auzar, nivesh, कैमरा, मशीन) count as capital, not factory P&L.`
            : "Could not reach pns-expenses."}
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Paid by</TableHead>
            <TableHead>Particulars</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeletonRows columns={4} rows={6} />
          ) : list.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                No one-time investment rows in pns-expenses.
              </TableCell>
            </TableRow>
          ) : (
            list.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="whitespace-nowrap">{formatDay(row.date)}</TableCell>
                <TableCell>{row.paidBy ?? "—"}</TableCell>
                <TableCell>
                  <div className="max-w-[28rem] whitespace-pre-wrap break-words">{row.description}</div>
                  {row.billUrl ? (
                    <a
                      href={row.billUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary underline-offset-2 hover:underline"
                    >
                      Bill
                    </a>
                  ) : null}
                </TableCell>
                <TableCell className="text-right">{formatInr(row.amount)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function InvestmentsPage() {
  const navigate = useNavigate();
  const { data, isLoading, isFetching, refetch } = useInvestments();

  return (
    <div className="grid gap-4">
      <PageHeader
        title="One-time investment"
        backTo="/"
        backLabel="Back to Dashboard"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
              Refresh
            </Button>
            <Button type="button" onClick={() => navigate("/purchase/new")}>
              <Plus className="size-4" />
              New bill
            </Button>
          </div>
        }
      />
      <p className="text-sm text-muted-foreground">
        Capital buys (CNC, Traub, tools, camera) stay here. They are not factory running costs on Profit &amp; Loss.
      </p>
      <SummaryCards
        bills={data?.totals.bills ?? 0}
        expenses={data?.totals.expenses ?? 0}
        combined={data?.totals.combined ?? 0}
        isLoading={isLoading}
      />
      <BillsTable bills={data?.bills} isLoading={isLoading} />
      <ExpensesTable rows={data?.expenses} fetchedAt={data?.expensesFetchedAt} isLoading={isLoading} />
    </div>
  );
}
