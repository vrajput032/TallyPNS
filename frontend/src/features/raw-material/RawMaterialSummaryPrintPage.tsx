import { ArrowLeft, ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { COMPANY } from "@/config/company";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DetailSkeleton } from "@/components/loading/PageSkeletons";
import {
  isInMonth,
  monthInputValue,
  monthLabel,
  parseMonthInput,
  parseMonthQuery,
} from "@/features/sales/salesMonthUtils";
import { useIsCompactNav } from "@/hooks/useIsMobile";
import { formatInr } from "@/lib/formatInr";
import { piecesFromKg } from "@/lib/rawMaterialYield";
import {
  formatShortDate,
  paymentStatusLabel,
  sheetCell,
  sheetFoot,
  sheetHead,
} from "@/lib/summarySheet";
import { cn } from "@/lib/utils";
import type { RawMaterialBill } from "./types";
import { useRawMaterialBills } from "./useRawMaterial";

type Period = { kind: "all" } | { kind: "month"; year: number; month: number };

type Totals = {
  kg: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  roundOff: number;
  amount: number;
  paid: number;
  balance: number;
};

type SupplierRow = {
  key: string;
  name: string;
  gstin: string | null;
  bills: number;
  kg: number;
  taxable: number;
  gst: number;
  amount: number;
};

/** Defaults to the current month when the URL names no period. */
function parsePeriod(search: URLSearchParams): Period {
  if (search.get("view") === "all") return { kind: "all" };
  const period = parseMonthQuery(search.get("year"), search.get("month"));
  if (period) return { kind: "month", ...period };
  const now = new Date();
  return { kind: "month", year: now.getFullYear(), month: now.getMonth() + 1 };
}

function periodLabel(period: Period) {
  return period.kind === "all" ? "All time" : monthLabel(period.year, period.month);
}

function printFileName(period: Period) {
  if (period.kind === "all") return "PNS-RawMaterial-All";
  return `PNS-RawMaterial-${period.year}-${String(period.month).padStart(2, "0")}-Summary`;
}

function billGst(bill: RawMaterialBill) {
  return Number(bill.cgstAmount) + Number(bill.sgstAmount) + Number(bill.igstAmount);
}

function billsForPeriod(bills: RawMaterialBill[], period: Period) {
  const list =
    period.kind === "all"
      ? bills
      : bills.filter((bill) => isInMonth(bill.billDate, period.year, period.month));
  return [...list].sort(
    (a, b) =>
      new Date(a.billDate).getTime() - new Date(b.billDate).getTime() ||
      a.billNo.localeCompare(b.billNo)
  );
}

function supplierSummary(rows: RawMaterialBill[]): SupplierRow[] {
  const groups = new Map<string, SupplierRow>();
  for (const bill of rows) {
    const key = (bill.supplierGstin || bill.supplierName).trim().toUpperCase();
    const group = groups.get(key) ?? {
      key,
      name: bill.supplierName,
      gstin: bill.supplierGstin,
      bills: 0,
      kg: 0,
      taxable: 0,
      gst: 0,
      amount: 0,
    };
    group.bills += 1;
    group.kg += Number(bill.totalKg);
    group.taxable += Number(bill.taxableAmount);
    group.gst += billGst(bill);
    group.amount += Number(bill.totalAmount);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function formatKg(kg: number) {
  return kg.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function RawMaterialSummarySheet({
  rows,
  totals,
  suppliers,
  label,
  generatedOn,
}: {
  rows: RawMaterialBill[];
  totals: Totals;
  suppliers: SupplierRow[];
  label: string;
  generatedOn: string;
}) {
  const singleSupplier = suppliers.length === 1 ? suppliers[0] : null;
  const totalGst = totals.cgst + totals.sgst + totals.igst;
  const yieldRows = piecesFromKg(totals.kg);

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
        <h2 className="mt-3 text-base font-semibold uppercase tracking-wide">
          Raw material purchase summary
        </h2>
        <p className="text-sm">
          Period: {label} · {rows.length} bill{rows.length === 1 ? "" : "s"} · Generated {generatedOn}
        </p>
        {singleSupplier ? (
          <p className="mt-1 text-sm">
            Supplier: <span className="font-semibold">{singleSupplier.name}</span> · GSTIN:{" "}
            <span className="font-semibold">{singleSupplier.gstin || "Not registered"}</span>
          </p>
        ) : null}
      </header>

      <table className="mt-4 w-full table-fixed border-collapse text-[10px] leading-tight">
        <colgroup>
          <col style={{ width: "11.5%" }} />
          <col style={{ width: "8%" }} />
          <col style={{ width: "14.5%" }} />
          <col style={{ width: "6.5%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "9.5%" }} />
          <col style={{ width: "11%" }} />
          <col style={{ width: "10.5%" }} />
          <col style={{ width: "10.5%" }} />
          <col style={{ width: "7%" }} />
        </colgroup>
        <thead>
          <tr>
            <th className={cn(sheetHead, "text-left")}>Bill No.</th>
            <th className={cn(sheetHead, "text-left")}>Date</th>
            <th className={cn(sheetHead, "text-left")}>Supplier</th>
            <th className={cn(sheetHead, "text-right")}>Kg</th>
            <th className={cn(sheetHead, "text-right")}>Taxable</th>
            <th className={cn(sheetHead, "text-right")}>GST</th>
            <th className={cn(sheetHead, "text-right")}>Total</th>
            <th className={cn(sheetHead, "text-right")}>Paid</th>
            <th className={cn(sheetHead, "text-right")}>Balance</th>
            <th className={cn(sheetHead, "text-left")}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((bill) => (
            <tr key={bill.id}>
              <td className={cn(sheetCell, "break-words")}>{bill.billNo}</td>
              <td className={cn(sheetCell, "whitespace-nowrap")}>{formatShortDate(bill.billDate)}</td>
              <td className={cn(sheetCell, "break-words")}>{bill.supplierName}</td>
              <td className={cn(sheetCell, "text-right tabular-nums")}>
                {formatKg(Number(bill.totalKg))}
              </td>
              <td className={cn(sheetCell, "text-right tabular-nums")}>
                {formatInr(bill.taxableAmount)}
              </td>
              <td className={cn(sheetCell, "text-right tabular-nums")}>{formatInr(billGst(bill))}</td>
              <td className={cn(sheetCell, "text-right tabular-nums")}>
                {formatInr(bill.totalAmount)}
              </td>
              <td className={cn(sheetCell, "text-right tabular-nums")}>
                {formatInr(bill.paidAmount ?? 0)}
              </td>
              <td className={cn(sheetCell, "text-right tabular-nums")}>
                {formatInr(bill.balanceAmount ?? 0)}
              </td>
              <td className={cn(sheetCell, "whitespace-nowrap")}>
                {paymentStatusLabel(bill.paymentStatus)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <td className={sheetFoot} colSpan={3}>
              Total
            </td>
            <td className={cn(sheetFoot, "text-right tabular-nums")}>{formatKg(totals.kg)}</td>
            <td className={cn(sheetFoot, "text-right tabular-nums")}>
              {formatInr(totals.taxable)}
            </td>
            <td className={cn(sheetFoot, "text-right tabular-nums")}>{formatInr(totalGst)}</td>
            <td className={cn(sheetFoot, "text-right tabular-nums")}>{formatInr(totals.amount)}</td>
            <td className={cn(sheetFoot, "text-right tabular-nums")}>{formatInr(totals.paid)}</td>
            <td className={cn(sheetFoot, "text-right tabular-nums")}>
              {formatInr(totals.balance)}
            </td>
            <td className={sheetFoot} />
          </tr>
        </tfoot>
      </table>

      <p className="mt-2 text-[10px]">
        Steel in: <span className="font-semibold">{formatKg(totals.kg)} kg</span> · Can make{" "}
        {yieldRows
          .map((row) => `${row.sizeMm} mm ${Math.floor(row.pieces).toLocaleString("en-IN")} pcs`)
          .join(" · ")}
      </p>

      <section className="mt-5 break-inside-avoid">
        <h3 className="text-xs font-semibold uppercase tracking-wide">Supplier summary</h3>
        <table className="mt-1.5 w-full table-fixed border-collapse text-[10px] leading-tight">
          <colgroup>
            <col style={{ width: "27%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "14%" }} />
          </colgroup>
          <thead>
            <tr>
              <th className={cn(sheetHead, "text-left")}>Supplier</th>
              <th className={cn(sheetHead, "text-left")}>GSTIN</th>
              <th className={cn(sheetHead, "text-right")}>Bills</th>
              <th className={cn(sheetHead, "text-right")}>Kg</th>
              <th className={cn(sheetHead, "text-right")}>Taxable</th>
              <th className={cn(sheetHead, "text-right")}>GST</th>
              <th className={cn(sheetHead, "text-right")}>Total</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((supplier) => (
              <tr key={supplier.key}>
                <td className={cn(sheetCell, "break-words")}>{supplier.name}</td>
                <td className={cn(sheetCell, "whitespace-nowrap font-mono tracking-tight")}>
                  {supplier.gstin || "Not registered"}
                </td>
                <td className={cn(sheetCell, "text-right tabular-nums")}>{supplier.bills}</td>
                <td className={cn(sheetCell, "text-right tabular-nums")}>{formatKg(supplier.kg)}</td>
                <td className={cn(sheetCell, "text-right tabular-nums")}>
                  {formatInr(supplier.taxable)}
                </td>
                <td className={cn(sheetCell, "text-right tabular-nums")}>
                  {formatInr(supplier.gst)}
                </td>
                <td className={cn(sheetCell, "text-right tabular-nums")}>
                  {formatInr(supplier.amount)}
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
              <td className={cn(sheetFoot, "text-right tabular-nums")}>{formatKg(totals.kg)}</td>
              <td className={cn(sheetFoot, "text-right tabular-nums")}>
                {formatInr(totals.taxable)}
              </td>
              <td className={cn(sheetFoot, "text-right tabular-nums")}>{formatInr(totalGst)}</td>
              <td className={cn(sheetFoot, "text-right tabular-nums")}>
                {formatInr(totals.amount)}
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section className="mt-5 break-inside-avoid">
        <h3 className="text-xs font-semibold uppercase tracking-wide">GST summary (input tax)</h3>
        <table className="mt-1.5 w-full table-fixed border-collapse text-[10px] leading-tight">
          <thead>
            <tr>
              <th className={cn(sheetHead, "text-right")}>Taxable</th>
              <th className={cn(sheetHead, "text-right")}>CGST</th>
              <th className={cn(sheetHead, "text-right")}>SGST</th>
              <th className={cn(sheetHead, "text-right")}>IGST</th>
              <th className={cn(sheetHead, "text-right")}>Total GST</th>
              <th className={cn(sheetHead, "text-right")}>Round-off</th>
              <th className={cn(sheetHead, "text-right")}>Bill total</th>
            </tr>
          </thead>
          <tbody>
            <tr className="font-semibold">
              <td className={cn(sheetFoot, "text-right tabular-nums")}>
                {formatInr(totals.taxable)}
              </td>
              <td className={cn(sheetFoot, "text-right tabular-nums")}>{formatInr(totals.cgst)}</td>
              <td className={cn(sheetFoot, "text-right tabular-nums")}>{formatInr(totals.sgst)}</td>
              <td className={cn(sheetFoot, "text-right tabular-nums")}>{formatInr(totals.igst)}</td>
              <td className={cn(sheetFoot, "text-right tabular-nums")}>{formatInr(totalGst)}</td>
              <td className={cn(sheetFoot, "text-right tabular-nums")}>
                {formatInr(totals.roundOff)}
              </td>
              <td className={cn(sheetFoot, "text-right tabular-nums")}>
                {formatInr(totals.amount)}
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}

export function RawMaterialSummaryPrintPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isCompactNav = useIsCompactNav();
  const period = useMemo(() => parsePeriod(searchParams), [searchParams]);
  const { data: bills, isLoading } = useRawMaterialBills();

  const rows = useMemo(() => billsForPeriod(bills ?? [], period), [bills, period]);

  const totals = useMemo<Totals>(
    () =>
      rows.reduce<Totals>(
        (acc, bill) => {
          acc.kg += Number(bill.totalKg);
          acc.taxable += Number(bill.taxableAmount);
          acc.cgst += Number(bill.cgstAmount);
          acc.sgst += Number(bill.sgstAmount);
          acc.igst += Number(bill.igstAmount);
          acc.roundOff += Number(bill.roundOff);
          acc.amount += Number(bill.totalAmount);
          acc.paid += Number(bill.paidAmount ?? 0);
          acc.balance += Number(bill.balanceAmount ?? 0);
          return acc;
        },
        { kg: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, roundOff: 0, amount: 0, paid: 0, balance: 0 }
      ),
    [rows]
  );

  const suppliers = useMemo(() => supplierSummary(rows), [rows]);
  const fileTitle = printFileName(period);

  useEffect(() => {
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
  }, [fileTitle]);

  if (isLoading) return <DetailSkeleton />;

  const label = periodLabel(period);
  const generatedOn = new Date().toLocaleDateString("en-GB");
  const monthPeriod =
    period.kind === "month" ? period : { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };

  function showMonth(year: number, month: number) {
    setSearchParams({ year: String(year), month: String(month) }, { replace: true });
  }

  function shiftMonth(delta: number) {
    const date = new Date(monthPeriod.year, monthPeriod.month - 1 + delta, 1);
    showMonth(date.getFullYear(), date.getMonth() + 1);
  }

  function handlePrint() {
    document.title = fileTitle;
    window.print();
    document.title = "PNS ERP";
  }

  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid gap-3 print:hidden">
        {isCompactNav ? null : (
          <div>
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link to="/raw-material" />}>
              <ArrowLeft className="size-4" />
              Back to Raw material
            </Button>
            <h1 className="mt-2 text-xl font-semibold">Raw material PDF · {label}</h1>
            <p className="text-sm text-muted-foreground">
              {rows.length} bill{rows.length === 1 ? "" : "s"} · Use{" "}
              <span className="font-medium">Save as PDF</span> in the print dialog to download
            </p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={period.kind === "month" ? "default" : "outline"}
            onClick={() => showMonth(monthPeriod.year, monthPeriod.month)}
          >
            Month
          </Button>
          <Button
            type="button"
            size="sm"
            variant={period.kind === "all" ? "default" : "outline"}
            onClick={() => setSearchParams({ view: "all" }, { replace: true })}
          >
            All
          </Button>
          {period.kind === "month" ? (
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={() => shiftMonth(-1)}
                aria-label="Previous month"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Input
                type="month"
                className="flex-1 text-center sm:w-[10.5rem] sm:flex-none"
                value={monthInputValue(period.year, period.month)}
                onChange={(event) => {
                  const parsed = parseMonthInput(event.target.value);
                  if (parsed) showMonth(parsed.year, parsed.month);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={() => shiftMonth(1)}
                aria-label="Next month"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          ) : null}
          <Button
            onClick={handlePrint}
            disabled={rows.length === 0}
            className={cn("sm:ml-auto", isCompactNav && "w-full")}
          >
            <Printer className="size-4" />
            Download / Print
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="print:hidden py-16 text-center text-sm text-muted-foreground">
          No raw material bills for {label}.
        </p>
      ) : (
        <>
          {isCompactNav ? (
            <p className="text-xs text-muted-foreground print:hidden">
              {rows.length} bill{rows.length === 1 ? "" : "s"} · ₹{formatInr(totals.amount)} · Swipe
              sideways to see the full sheet.
            </p>
          ) : null}
          <div className="sales-totals-scroll -mx-4 overflow-x-auto px-4 print:mx-0 print:overflow-visible print:px-0">
            <RawMaterialSummarySheet
              rows={rows}
              totals={totals}
              suppliers={suppliers}
              label={label}
              generatedOn={generatedOn}
            />
          </div>
        </>
      )}
    </div>
  );
}
