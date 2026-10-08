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
import {
  formatSheetDate,
  formatShortDate,
  paymentStatusLabel,
  sheetCell,
  sheetFoot,
  sheetHead,
} from "@/lib/summarySheet";
import { cn } from "@/lib/utils";
import {
  isInMonth,
  parseSalesTotalsQuery,
  salesTotalsPeriodLabel,
  salesTotalsPrintFileName,
  type SalesTotalsPeriod,
} from "./salesMonthUtils";
import { applySalesFilters, describeSalesFilters, parseSalesFilters } from "./salesFilters";
import { SaleTypeBadge } from "./TradingBadge";
import { invoicePieces, invoiceQuantityLabel, type SalesInvoice } from "./types";
import { useSalesInvoices } from "./useSales";

type Totals = {
  pieces: number;
  taxable: number;
  gst: number;
  amount: number;
  paid: number;
  balance: number;
};

/** `intraTax` is split equally into CGST + SGST; `interTax` is IGST. */
type GstRateRow = { rate: number; taxable: number; intraTax: number; interTax: number };

/** Same maths as the GST tax invoice print: taxable = qty × rate, tax = taxable × GST %. */
function invoiceTaxable(invoice: SalesInvoice) {
  return invoice.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.rate), 0);
}

function invoiceGst(invoice: SalesInvoice) {
  return invoice.items.reduce(
    (sum, item) => sum + (Number(item.quantity) * Number(item.rate) * Number(item.gstRate)) / 100,
    0
  );
}

/** Same place-of-supply rule as the tax invoice: customer GSTIN state vs ours. */
function isIntraState(invoice: SalesInvoice) {
  const supplyCode = invoice.customer.gstin?.slice(0, 2) || COMPANY.stateCode;
  return supplyCode === COMPANY.stateCode;
}

function gstByRate(rows: SalesInvoice[]): GstRateRow[] {
  const groups = new Map<number, GstRateRow>();
  for (const invoice of rows) {
    const intra = isIntraState(invoice);
    for (const item of invoice.items) {
      const rate = Number(item.gstRate);
      const taxable = Number(item.quantity) * Number(item.rate);
      const tax = (taxable * rate) / 100;
      const group = groups.get(rate) ?? { rate, taxable: 0, intraTax: 0, interTax: 0 };
      group.taxable += taxable;
      if (intra) group.intraTax += tax;
      else group.interTax += tax;
      groups.set(rate, group);
    }
  }
  return [...groups.values()].sort((a, b) => a.rate - b.rate);
}

type CustomerRow = {
  id: string;
  name: string;
  gstin: string | null;
  bills: number;
  taxable: number;
  gst: number;
  amount: number;
};

function customerSummary(rows: SalesInvoice[]): CustomerRow[] {
  const groups = new Map<string, CustomerRow>();
  for (const invoice of rows) {
    const group = groups.get(invoice.customerId) ?? {
      id: invoice.customerId,
      name: invoice.customer.name,
      gstin: invoice.customer.gstin,
      bills: 0,
      taxable: 0,
      gst: 0,
      amount: 0,
    };
    group.bills += 1;
    group.taxable += invoiceTaxable(invoice);
    group.gst += invoiceGst(invoice);
    group.amount += Number(invoice.totalAmount);
    groups.set(invoice.customerId, group);
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function formatRate(rate: number) {
  return `${Number.isInteger(rate) ? rate : rate.toFixed(2)}%`;
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
  gstRates,
  customers,
  label,
  generatedOn,
}: {
  rows: SalesInvoice[];
  totals: Totals;
  gstRates: GstRateRow[];
  customers: CustomerRow[];
  label: string;
  generatedOn: string;
}) {
  const singleCustomer = customers.length === 1 ? customers[0] : null;

  return (
    <div className="sales-totals-sheet relative z-[1] mx-auto w-[190mm] bg-white p-6 text-black">
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
        {singleCustomer ? (
          <p className="mt-1 text-sm">
            Customer: <span className="font-semibold">{singleCustomer.name}</span> · GSTIN:{" "}
            <span className="font-semibold">{singleCustomer.gstin || "Not registered"}</span>
          </p>
        ) : null}
      </header>

      <table className="mt-4 w-full table-fixed border-collapse text-[10px] leading-tight">
        <colgroup>
          <col style={{ width: "11.5%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "14.5%" }} />
          <col style={{ width: "6%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "9.5%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "10.5%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "7%" }} />
        </colgroup>
        <thead>
          <tr>
            <th className={cn(sheetHead, "text-left")}>Invoice</th>
            <th className={cn(sheetHead, "text-left")}>Date</th>
            <th className={cn(sheetHead, "text-left")}>Customer</th>
            <th className={cn(sheetHead, "text-right")}>Pcs</th>
            <th className={cn(sheetHead, "text-right")}>Taxable</th>
            <th className={cn(sheetHead, "text-right")}>GST</th>
            <th className={cn(sheetHead, "text-right")}>Total</th>
            <th className={cn(sheetHead, "text-right")}>Received</th>
            <th className={cn(sheetHead, "text-right")}>Balance</th>
            <th className={cn(sheetHead, "text-left")}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((invoice) => (
            <tr key={invoice.id}>
              <td className={cn(sheetCell, "break-words")}>
                {invoice.invoiceNo}
                {invoice.isTrading || invoice.isRawMaterialTrading ? (
                  <span className="mt-0.5 block w-fit rounded-sm border border-black px-1 text-[8px] font-semibold uppercase leading-[1.4] tracking-wide">
                    {invoice.isRawMaterialTrading ? "RM Trading" : "Trading"}
                  </span>
                ) : null}
              </td>
              <td className={cn(sheetCell, "whitespace-nowrap")}>
                {formatShortDate(invoice.invoiceDate)}
              </td>
              <td className={cn(sheetCell, "break-words")}>{invoice.customer.name}</td>
              <td className={cn(sheetCell, "text-right tabular-nums")}>
                {invoiceQuantityLabel(invoice)}
              </td>
              <td className={cn(sheetCell, "text-right tabular-nums")}>
                {formatInr(invoiceTaxable(invoice))}
              </td>
              <td className={cn(sheetCell, "text-right tabular-nums")}>
                {formatInr(invoiceGst(invoice))}
              </td>
              <td className={cn(sheetCell, "text-right tabular-nums")}>
                {formatInr(invoice.totalAmount)}
              </td>
              <td className={cn(sheetCell, "text-right tabular-nums")}>
                {formatInr(invoice.paidAmount)}
              </td>
              <td className={cn(sheetCell, "text-right tabular-nums")}>
                {formatInr(invoice.balanceAmount)}
              </td>
              <td className={cn(sheetCell, "whitespace-nowrap")}>
                {paymentStatusLabel(invoice.paymentStatus)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <td className={sheetFoot} colSpan={3}>
              Total
            </td>
            <td className={cn(sheetFoot, "text-right tabular-nums")}>
              {totals.pieces.toLocaleString("en-IN")}
            </td>
            <td className={cn(sheetFoot, "text-right tabular-nums")}>
              {formatInr(totals.taxable)}
            </td>
            <td className={cn(sheetFoot, "text-right tabular-nums")}>{formatInr(totals.gst)}</td>
            <td className={cn(sheetFoot, "text-right tabular-nums")}>
              {formatInr(totals.amount)}
            </td>
            <td className={cn(sheetFoot, "text-right tabular-nums")}>{formatInr(totals.paid)}</td>
            <td className={cn(sheetFoot, "text-right tabular-nums")}>
              {formatInr(totals.balance)}
            </td>
            <td className={sheetFoot} />
          </tr>
        </tfoot>
      </table>

      <section className="mt-5 break-inside-avoid">
        <h3 className="text-xs font-semibold uppercase tracking-wide">Customer summary</h3>
        <table className="mt-1.5 w-full table-fixed border-collapse text-[10px] leading-tight">
          <colgroup>
            <col style={{ width: "30%" }} />
            <col style={{ width: "19%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "16%" }} />
          </colgroup>
          <thead>
            <tr>
              <th className={cn(sheetHead, "text-left")}>Customer</th>
              <th className={cn(sheetHead, "text-left")}>GSTIN</th>
              <th className={cn(sheetHead, "text-right")}>Bills</th>
              <th className={cn(sheetHead, "text-right")}>Taxable</th>
              <th className={cn(sheetHead, "text-right")}>GST</th>
              <th className={cn(sheetHead, "text-right")}>Total</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id}>
                <td className={cn(sheetCell, "break-words")}>{customer.name}</td>
                <td className={cn(sheetCell, "whitespace-nowrap font-mono tracking-tight")}>
                  {customer.gstin || "Not registered"}
                </td>
                <td className={cn(sheetCell, "text-right tabular-nums")}>{customer.bills}</td>
                <td className={cn(sheetCell, "text-right tabular-nums")}>
                  {formatInr(customer.taxable)}
                </td>
                <td className={cn(sheetCell, "text-right tabular-nums")}>
                  {formatInr(customer.gst)}
                </td>
                <td className={cn(sheetCell, "text-right tabular-nums")}>
                  {formatInr(customer.amount)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td className={sheetFoot} colSpan={2}>
                Total
              </td>
              <td className={cn(sheetFoot, "text-right tabular-nums")}>{rows.length}</td>
              <td className={cn(sheetFoot, "text-right tabular-nums")}>
                {formatInr(totals.taxable)}
              </td>
              <td className={cn(sheetFoot, "text-right tabular-nums")}>{formatInr(totals.gst)}</td>
              <td className={cn(sheetFoot, "text-right tabular-nums")}>
                {formatInr(totals.amount)}
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section className="mt-5 break-inside-avoid">
        <h3 className="text-xs font-semibold uppercase tracking-wide">GST summary</h3>
        <table className="mt-1.5 w-[75%] table-fixed border-collapse text-[10px] leading-tight">
          <thead>
            <tr>
              <th className={cn(sheetHead, "text-left")}>GST rate</th>
              <th className={cn(sheetHead, "text-right")}>Taxable</th>
              <th className={cn(sheetHead, "text-right")}>CGST</th>
              <th className={cn(sheetHead, "text-right")}>SGST</th>
              <th className={cn(sheetHead, "text-right")}>IGST</th>
              <th className={cn(sheetHead, "text-right")}>Total GST</th>
            </tr>
          </thead>
          <tbody>
            {gstRates.map((group) => (
              <tr key={group.rate}>
                <td className={sheetCell}>{formatRate(group.rate)}</td>
                <td className={cn(sheetCell, "text-right tabular-nums")}>
                  {formatInr(group.taxable)}
                </td>
                <td className={cn(sheetCell, "text-right tabular-nums")}>
                  {formatInr(group.intraTax / 2)}
                </td>
                <td className={cn(sheetCell, "text-right tabular-nums")}>
                  {formatInr(group.intraTax / 2)}
                </td>
                <td className={cn(sheetCell, "text-right tabular-nums")}>
                  {formatInr(group.interTax)}
                </td>
                <td className={cn(sheetCell, "text-right tabular-nums")}>
                  {formatInr(group.intraTax + group.interTax)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td className={sheetFoot}>Total</td>
              <td className={cn(sheetFoot, "text-right tabular-nums")}>
                {formatInr(totals.taxable)}
              </td>
              <td className={cn(sheetFoot, "text-right tabular-nums")}>
                {formatInr(gstRates.reduce((sum, g) => sum + g.intraTax, 0) / 2)}
              </td>
              <td className={cn(sheetFoot, "text-right tabular-nums")}>
                {formatInr(gstRates.reduce((sum, g) => sum + g.intraTax, 0) / 2)}
              </td>
              <td className={cn(sheetFoot, "text-right tabular-nums")}>
                {formatInr(gstRates.reduce((sum, g) => sum + g.interTax, 0))}
              </td>
              <td className={cn(sheetFoot, "text-right tabular-nums")}>{formatInr(totals.gst)}</td>
            </tr>
          </tfoot>
        </table>
      </section>
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
      <Table className="min-w-[56rem] text-xs sm:text-sm">
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-10 bg-card">Invoice</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead className="text-right">Pcs</TableHead>
            <TableHead className="text-right">Taxable</TableHead>
            <TableHead className="text-right">GST</TableHead>
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
                <div className="flex flex-col items-start gap-1">
                  {invoice.invoiceNo}
                  <SaleTypeBadge invoice={invoice} />
                </div>
              </TableCell>
              <TableCell>{formatSheetDate(invoice.invoiceDate)}</TableCell>
              <TableCell className="max-w-[10rem] truncate">{invoice.customer.name}</TableCell>
              <TableCell className="text-right tabular-nums">
                {invoiceQuantityLabel(invoice)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatInr(invoiceTaxable(invoice))}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatInr(invoiceGst(invoice))}
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
            <TableCell className="text-right tabular-nums">{formatInr(totals.taxable)}</TableCell>
            <TableCell className="text-right tabular-nums">{formatInr(totals.gst)}</TableCell>
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
  const filters = useMemo(() => parseSalesFilters(searchParams), [searchParams]);
  const filterSummary = describeSalesFilters(
    filters,
    invoices?.find((invoice) => invoice.customerId === filters.customerId)?.customer.name
  );

  const rows = useMemo(() => {
    if (!period || !invoices) return [];
    return applySalesFilters(invoicesForPeriod(invoices, period), filters);
  }, [invoices, period, filters]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, invoice) => {
        acc.pieces += invoicePieces(invoice);
        acc.taxable += invoiceTaxable(invoice);
        acc.gst += invoiceGst(invoice);
        acc.amount += Number(invoice.totalAmount);
        acc.paid += Number(invoice.paidAmount);
        acc.balance += Number(invoice.balanceAmount);
        return acc;
      },
      { pieces: 0, taxable: 0, gst: 0, amount: 0, paid: 0, balance: 0 }
    );
  }, [rows]);

  const gstRates = useMemo(() => gstByRate(rows), [rows]);
  const customers = useMemo(() => customerSummary(rows), [rows]);

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
  const label = [salesTotalsPeriodLabel(selectedPeriod), filterSummary].filter(Boolean).join(" · ");
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
              gstRates={gstRates}
              customers={customers}
              label={label}
              generatedOn={generatedOn}
            />
          </div>
        </>
      )}
    </div>
  );
}
