import { ArrowLeft, Printer } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { COMPANY } from "@/config/company";
import { Button } from "@/components/ui/button";
import { DetailSkeleton } from "@/components/loading/PageSkeletons";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaymentStatusBadge } from "@/features/payments/PaymentStatusBadge";
import { useIsCompactNav } from "@/hooks/useIsMobile";
import { formatInr } from "@/lib/formatInr";
import { cn } from "@/lib/utils";
import {
  isInMonth,
  parseSalesTotalsQuery,
  salesTotalsPeriodLabel,
  salesTotalsPrintFileName,
  type SalesTotalsPeriod,
} from "./salesMonthUtils";
import { invoicePieces, type SalesInvoice } from "./types";
import { useSalesInvoices } from "./useSales";

type Totals = {
  pieces: number;
  amount: number;
  paid: number;
  balance: number;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB");
}

function paymentStatusLabel(status: SalesInvoice["paymentStatus"] | undefined): string {
  const value = status ?? "PENDING";
  switch (value) {
    case "PAID":
      return "Paid";
    case "PARTIAL":
      return "Partial";
    case "PENDING":
      return "Pending";
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}

function sortInvoices(a: SalesInvoice, b: SalesInvoice) {
  return (
    new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime() ||
    a.invoiceNo.localeCompare(b.invoiceNo)
  );
}

function invoicesForPeriod(invoices: SalesInvoice[], period: SalesTotalsPeriod) {
  const list =
    period.kind === "all"
      ? invoices
      : invoices.filter((invoice) => isInMonth(invoice.invoiceDate, period.year, period.month));
  return [...list].sort(sortInvoices);
}

function SalesTotalsSheet({
  rows,
  totals,
  label,
  generatedOn,
}: {
  rows: SalesInvoice[];
  totals: Totals;
  label: string;
  generatedOn: string;
}) {
  return (
    <div className="sales-totals-sheet mx-auto w-[190mm] bg-white p-6 text-black">
      <header className="border-b-2 border-black pb-3">
        <p className="text-lg font-bold tracking-wide">{COMPANY.name}</p>
        {COMPANY.address.map((line) => (
          <p key={line} className="text-xs">
            {line}
          </p>
        ))}
        <p className="mt-1 text-xs">GSTIN: {COMPANY.gstin}</p>
        <h2 className="mt-3 text-base font-semibold uppercase tracking-wide">Sales summary</h2>
        <p className="text-sm">
          Period: {label} · {rows.length} invoice{rows.length === 1 ? "" : "s"} · Generated {generatedOn}
        </p>
      </header>

      <table className="mt-4 w-full table-fixed border-collapse text-[11px] leading-tight">
        <colgroup>
          <col style={{ width: "15%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "21%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "10%" }} />
        </colgroup>
        <thead>
          <tr>
            <th className="border border-black px-1.5 py-1.5 text-left font-semibold">Invoice</th>
            <th className="border border-black px-1.5 py-1.5 text-left font-semibold">Date</th>
            <th className="border border-black px-1.5 py-1.5 text-left font-semibold">Customer</th>
            <th className="border border-black px-1.5 py-1.5 text-right font-semibold">Pcs</th>
            <th className="border border-black px-1.5 py-1.5 text-right font-semibold">Total</th>
            <th className="border border-black px-1.5 py-1.5 text-right font-semibold">Received</th>
            <th className="border border-black px-1.5 py-1.5 text-right font-semibold">Balance</th>
            <th className="border border-black px-1.5 py-1.5 text-left font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((invoice) => (
            <tr key={invoice.id}>
              <td className="border border-black px-1.5 py-1 break-words">{invoice.invoiceNo}</td>
              <td className="border border-black px-1.5 py-1 whitespace-nowrap">
                {formatDate(invoice.invoiceDate)}
              </td>
              <td className="border border-black px-1.5 py-1 break-words">{invoice.customer.name}</td>
              <td className="border border-black px-1.5 py-1 text-right tabular-nums">
                {invoicePieces(invoice).toLocaleString("en-IN")}
              </td>
              <td className="border border-black px-1.5 py-1 text-right tabular-nums">
                {formatInr(invoice.totalAmount)}
              </td>
              <td className="border border-black px-1.5 py-1 text-right tabular-nums">
                {formatInr(invoice.paidAmount)}
              </td>
              <td className="border border-black px-1.5 py-1 text-right tabular-nums">
                {formatInr(invoice.balanceAmount)}
              </td>
              <td className="border border-black px-1.5 py-1 whitespace-nowrap">
                {paymentStatusLabel(invoice.paymentStatus)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <td className="border border-black px-1.5 py-1.5" colSpan={3}>
              Total
            </td>
            <td className="border border-black px-1.5 py-1.5 text-right tabular-nums">
              {totals.pieces.toLocaleString("en-IN")}
            </td>
            <td className="border border-black px-1.5 py-1.5 text-right tabular-nums">
              {formatInr(totals.amount)}
            </td>
            <td className="border border-black px-1.5 py-1.5 text-right tabular-nums">
              {formatInr(totals.paid)}
            </td>
            <td className="border border-black px-1.5 py-1.5 text-right tabular-nums">
              {formatInr(totals.balance)}
            </td>
            <td className="border border-black px-1.5 py-1.5" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function SalesTotalsScreenTable({
  rows,
  totals,
  onOpen,
  edgeToEdge,
}: {
  rows: SalesInvoice[];
  totals: Totals;
  onOpen: (id: string) => void;
  edgeToEdge?: boolean;
}) {
  return (
    <div
      className={cn(
        "print:hidden min-w-0 border bg-card",
        edgeToEdge ? "-mx-4 max-w-[100vw] rounded-none border-x-0" : "rounded-md"
      )}
    >
      <Table className="min-w-[46rem] text-xs sm:text-sm">
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-10 bg-card">Invoice</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead className="text-right">Pcs</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Received</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((invoice) => (
            <TableRow
              key={invoice.id}
              className="cursor-pointer"
              onClick={() => onOpen(invoice.id)}
            >
              <TableCell className="sticky left-0 z-10 bg-card font-medium">
                {invoice.invoiceNo}
              </TableCell>
              <TableCell>{formatDate(invoice.invoiceDate)}</TableCell>
              <TableCell className="max-w-[10rem] truncate">{invoice.customer.name}</TableCell>
              <TableCell className="text-right tabular-nums">
                {invoicePieces(invoice).toLocaleString("en-IN")}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatInr(invoice.totalAmount)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatInr(invoice.paidAmount)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatInr(invoice.balanceAmount)}
              </TableCell>
              <TableCell>
                <PaymentStatusBadge status={invoice.paymentStatus ?? "PENDING"} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell className="sticky left-0 z-10 bg-muted/50" colSpan={3}>
              Total
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {totals.pieces.toLocaleString("en-IN")}
            </TableCell>
            <TableCell className="text-right tabular-nums">{formatInr(totals.amount)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatInr(totals.paid)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatInr(totals.balance)}</TableCell>
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}

export function SalesTotalsPrintPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isCompactNav = useIsCompactNav();
  const period = parseSalesTotalsQuery(searchParams);
  const { data: invoices, isLoading } = useSalesInvoices();

  const rows = useMemo(() => {
    if (!period || !invoices) return [];
    return invoicesForPeriod(invoices, period);
  }, [invoices, period]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, invoice) => {
        acc.pieces += invoicePieces(invoice);
        acc.amount += Number(invoice.totalAmount);
        acc.paid += Number(invoice.paidAmount);
        acc.balance += Number(invoice.balanceAmount);
        return acc;
      },
      { pieces: 0, amount: 0, paid: 0, balance: 0 }
    );
  }, [rows]);

  useEffect(() => {
    if (!period) navigate("/sales", { replace: true });
  }, [navigate, period]);

  useEffect(() => {
    if (!period) return;
    const fileTitle = salesTotalsPrintFileName(period);

    function handleBeforePrint() {
      document.title = fileTitle;
    }
    function handleAfterPrint() {
      document.title = "PNS ERP";
    }

    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
      document.title = "PNS ERP";
    };
  }, [period]);

  if (!period) return null;
  if (isLoading) return <DetailSkeleton />;

  const selectedPeriod = period;
  const label = salesTotalsPeriodLabel(selectedPeriod);
  const generatedOn = new Date().toLocaleDateString("en-GB");

  function handlePrint() {
    document.title = salesTotalsPrintFileName(selectedPeriod);
    window.print();
    document.title = "PNS ERP";
  }

  return (
    <div className="grid min-w-0 gap-4">
      <div
        className={cn(
          "print:hidden",
          isCompactNav
            ? "grid gap-3"
            : "flex flex-wrap items-center justify-between gap-3"
        )}
      >
        {isCompactNav ? null : (
          <div>
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link to="/sales" />}>
              <ArrowLeft className="size-4" />
              Back to Sales
            </Button>
            <h1 className="mt-2 text-xl font-semibold">Sales PDF · {label}</h1>
            <p className="text-sm text-muted-foreground">
              {rows.length} invoice{rows.length === 1 ? "" : "s"} · Use{" "}
              <span className="font-medium">Save as PDF</span> in the print dialog to download
            </p>
          </div>
        )}
        <Button
          onClick={handlePrint}
          disabled={rows.length === 0}
          className={isCompactNav ? "w-full" : undefined}
        >
          <Printer className="size-4" />
          Download / Print
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="print:hidden py-16 text-center text-sm text-muted-foreground">
          No invoices found for {label}.
        </p>
      ) : (
        <>
          {isCompactNav ? (
            <div className="grid min-w-0 gap-3 print:hidden">
              <div className="grid grid-cols-3 overflow-hidden rounded-md border bg-card text-center">
                <div className="px-2 py-2.5">
                  <p className="text-[11px] text-muted-foreground">Bills</p>
                  <p className="font-bold tabular-nums">{rows.length}</p>
                </div>
                <div className="border-l px-2 py-2.5">
                  <p className="text-[11px] text-muted-foreground">Pieces</p>
                  <p className="font-bold tabular-nums">
                    {totals.pieces.toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="border-l px-2 py-2.5">
                  <p className="text-[11px] text-muted-foreground">Total</p>
                  <p className="font-bold tabular-nums">₹{formatInr(totals.amount)}</p>
                </div>
              </div>
              <SalesTotalsScreenTable
                rows={rows}
                totals={totals}
                edgeToEdge
                onOpen={(id) => navigate(`/sales/${id}`)}
              />
              <p className="text-xs text-muted-foreground">
                Swipe sideways for all columns. Tap a row to open the bill.
              </p>
            </div>
          ) : null}
          <div
            className={cn(
              "sales-totals-scroll -mx-4 overflow-x-auto px-4 print:mx-0 print:overflow-visible print:px-0",
              isCompactNav && "hidden print:block"
            )}
          >
            <SalesTotalsSheet
              rows={rows}
              totals={totals}
              label={label}
              generatedOn={generatedOn}
            />
          </div>
        </>
      )}
    </div>
  );
}
