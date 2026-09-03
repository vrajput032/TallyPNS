import { ArrowLeft, Printer } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DetailSkeleton } from "@/components/loading/PageSkeletons";
import { SalesInvoicePrint } from "./SalesInvoicePrint";
import {
  isInMonth,
  monthLabel,
  monthPrintFileName,
  parseMonthQuery,
} from "./salesMonthUtils";
import { useSalesInvoices } from "./useSales";

export function SalesInvoicesMonthPrintPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const period = parseMonthQuery(searchParams.get("year"), searchParams.get("month"));
  const { data: invoices, isLoading } = useSalesInvoices();

  const monthInvoices = useMemo(() => {
    if (!period || !invoices) return [];
    return invoices
      .filter((invoice) => isInMonth(invoice.invoiceDate, period.year, period.month))
      .sort(
        (a, b) =>
          new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime() ||
          a.invoiceNo.localeCompare(b.invoiceNo)
      );
  }, [invoices, period]);

  useEffect(() => {
    if (!period) {
      navigate("/sales", { replace: true });
    }
  }, [navigate, period]);

  useEffect(() => {
    if (!period) return;
    const fileTitle = monthPrintFileName(period.year, period.month);

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

  if (!period) {
    return null;
  }

  if (isLoading) {
    return <DetailSkeleton />;
  }

  function handlePrint() {
    document.title = monthPrintFileName(period!.year, period!.month);
    window.print();
    document.title = "PNS ERP";
  }

  const label = monthLabel(period.year, period.month);

  return (
    <div className="grid gap-4">
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link to="/sales" />}>
            <ArrowLeft className="size-4" />
            Back to Sales
          </Button>
          <h1 className="mt-2 text-xl font-semibold">{label} bills</h1>
          <p className="text-sm text-muted-foreground">
            {monthInvoices.length} invoice{monthInvoices.length === 1 ? "" : "s"} · Use{" "}
            <span className="font-medium">Save as PDF</span> in the print dialog to download
          </p>
        </div>
        <Button onClick={handlePrint} disabled={monthInvoices.length === 0}>
          <Printer className="size-4" />
          Download / Print
        </Button>
      </div>

      {monthInvoices.length === 0 ? (
        <p className="print:hidden py-16 text-center text-sm text-muted-foreground">
          No invoices found for {label}.
        </p>
      ) : (
        monthInvoices.map((invoice) => (
          <div key={invoice.id} className="invoice-print-page-break">
            <SalesInvoicePrint invoice={invoice} />
          </div>
        ))
      )}
    </div>
  );
}
