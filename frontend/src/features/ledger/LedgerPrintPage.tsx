import { ArrowLeft, Printer } from "lucide-react";
import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { COMPANY } from "@/config/company";
import { Button } from "@/components/ui/button";
import { DetailSkeleton } from "@/components/loading/PageSkeletons";
import { useIsCompactNav } from "@/hooks/useIsMobile";
import { formatInr } from "@/lib/formatInr";
import { cn } from "@/lib/utils";
import {
  formatLedgerBalance,
  formatLedgerDate,
  kindLabel,
  ledgerPrintFileName,
  moneyOrBlank,
} from "./ledgerUi";
import type { CustomerLedger, LedgerEntry } from "./types";
import { useCustomerLedger } from "./useLedger";

function contactLine(customer: CustomerLedger["customer"]) {
  return [customer.phone, customer.gstin, customer.address].filter(Boolean).join(" · ");
}

function LedgerSheet({
  data,
  generatedOn,
}: {
  data: CustomerLedger;
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
        <h2 className="mt-3 text-base font-semibold uppercase tracking-wide">
          Customer ledger
        </h2>
        <p className="text-sm font-semibold">{data.customer.name}</p>
        {contactLine(data.customer) ? (
          <p className="text-xs">{contactLine(data.customer)}</p>
        ) : null}
        <p className="mt-1 text-sm">
          {data.entries.length} {data.entries.length === 1 ? "entry" : "entries"} · Generated{" "}
          {generatedOn}
        </p>
      </header>

      <table className="mt-4 w-full table-fixed border-collapse text-[11px] leading-tight">
        <colgroup>
          <col style={{ width: "12%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "28%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "12%" }} />
          <col style={{ width: "12%" }} />
        </colgroup>
        <thead>
          <tr>
            <th className="border border-black px-1.5 py-1.5 text-left font-semibold">Date</th>
            <th className="border border-black px-1.5 py-1.5 text-left font-semibold">Type</th>
            <th className="border border-black px-1.5 py-1.5 text-left font-semibold">
              Particulars
            </th>
            <th className="border border-black px-1.5 py-1.5 text-left font-semibold">Voucher</th>
            <th className="border border-black px-1.5 py-1.5 text-right font-semibold">Debit</th>
            <th className="border border-black px-1.5 py-1.5 text-right font-semibold">Credit</th>
            <th className="border border-black px-1.5 py-1.5 text-right font-semibold">Balance</th>
          </tr>
        </thead>
        <tbody>
          {data.entries.length === 0 ? (
            <tr>
              <td className="border border-black px-1.5 py-2 text-center" colSpan={7}>
                No transactions yet.
              </td>
            </tr>
          ) : (
            data.entries.map((entry) => (
              <LedgerSheetRow key={`${entry.kind}-${entry.id}`} entry={entry} />
            ))
          )}
        </tbody>
        <tfoot>
          <tr className="font-semibold">
            <td className="border border-black px-1.5 py-1.5" colSpan={4}>
              Total
            </td>
            <td className="border border-black px-1.5 py-1.5 text-right tabular-nums">
              {formatInr(data.totalDebit)}
            </td>
            <td className="border border-black px-1.5 py-1.5 text-right tabular-nums">
              {formatInr(data.totalCredit)}
            </td>
            <td className="border border-black px-1.5 py-1.5 text-right tabular-nums">
              {formatLedgerBalance(data.closingBalance)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function LedgerSheetRow({ entry }: { entry: LedgerEntry }) {
  return (
    <tr>
      <td className="border border-black px-1.5 py-1 whitespace-nowrap">
        {formatLedgerDate(entry.date)}
      </td>
      <td className="border border-black px-1.5 py-1">{kindLabel(entry.kind)}</td>
      <td className="border border-black px-1.5 py-1 break-words">{entry.particulars}</td>
      <td className="border border-black px-1.5 py-1 break-words">{entry.voucherNo || "—"}</td>
      <td className="border border-black px-1.5 py-1 text-right tabular-nums">
        {moneyOrBlank(entry.debit)}
      </td>
      <td className="border border-black px-1.5 py-1 text-right tabular-nums">
        {moneyOrBlank(entry.credit)}
      </td>
      <td className="border border-black px-1.5 py-1 text-right tabular-nums">
        {formatLedgerBalance(entry.balance)}
      </td>
    </tr>
  );
}

export function LedgerPrintPage() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const isCompactNav = useIsCompactNav();
  const { data, isLoading, isError } = useCustomerLedger(customerId);

  const fileTitle = data ? ledgerPrintFileName(data.customer.name) : "PNS-ledger";

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

  useEffect(() => {
    if (!customerId) navigate("/ledger", { replace: true });
  }, [customerId, navigate]);

  if (!customerId) return null;

  if (isLoading) return <DetailSkeleton />;

  if (isError || !data) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">Customer not found.</p>
    );
  }

  const backTo = `/ledger/${data.customer.id}`;
  const generatedOn = new Date().toLocaleDateString("en-GB");

  function handlePrint() {
    document.title = fileTitle;
    window.print();
    document.title = "PNS ERP";
  }

  return (
    <div className="grid min-w-0 gap-4">
      <div
        className={cn(
          "print:hidden",
          isCompactNav ? "grid gap-3" : "flex flex-wrap items-center justify-between gap-3"
        )}
      >
        {isCompactNav ? null : (
          <div>
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link to={backTo} />}>
              <ArrowLeft className="size-4" />
              Back to ledger
            </Button>
            <h1 className="mt-2 text-xl font-semibold">Ledger PDF · {data.customer.name}</h1>
            <p className="text-sm text-muted-foreground">
              Use <span className="font-medium">Save as PDF</span> in the print dialog to download
            </p>
          </div>
        )}
        <Button onClick={handlePrint} className={isCompactNav ? "w-full" : undefined}>
          <Printer className="size-4" />
          Download / Print
        </Button>
      </div>

      <div className="sales-totals-scroll -mx-4 overflow-x-auto px-4 print:mx-0 print:overflow-visible print:px-0">
        <LedgerSheet data={data} generatedOn={generatedOn} />
      </div>
    </div>
  );
}
