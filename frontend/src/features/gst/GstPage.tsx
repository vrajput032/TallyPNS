import { Download, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";
import {
  useGstSummary,
  type GstRateBreakdown,
  type GstVoucherRow,
} from "./useGstSummary";

const GST_PORTAL_URL = "https://www.gst.gov.in/";
const GST_RETURNS_LOGIN_URL = "https://services.gst.gov.in/services/login";

function monthInputValue(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function parseMonthInput(value: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

function formatInr(value: number) {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDisplayDate(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

function filingBadgeVariant(
  status: "upcoming" | "open" | "overdue"
): "secondary" | "default" | "destructive" {
  switch (status) {
    case "open":
      return "default";
    case "overdue":
      return "destructive";
    case "upcoming":
      return "secondary";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function filingBadgeLabel(status: "upcoming" | "open" | "overdue") {
  switch (status) {
    case "open":
      return "Filing window open (1–11)";
    case "overdue":
      return "Past due date (11th)";
    case "upcoming":
      return "Upload after month ends";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function GstTable({ rows }: { rows: GstRateBreakdown[] }) {
  if (rows.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">No data for this month.</p>;
  }

  const totals = rows.reduce(
    (acc, row) => ({
      taxableAmount: acc.taxableAmount + row.taxableAmount,
      cgst: acc.cgst + row.cgst,
      sgst: acc.sgst + row.sgst,
      totalTax: acc.totalTax + row.totalTax,
    }),
    { taxableAmount: 0, cgst: 0, sgst: 0, totalTax: 0 }
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>GST Rate</TableHead>
          <TableHead className="text-right">Taxable Amount</TableHead>
          <TableHead className="text-right">CGST</TableHead>
          <TableHead className="text-right">SGST</TableHead>
          <TableHead className="text-right">Total Tax</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.gstRate}>
            <TableCell>{row.gstRate}%</TableCell>
            <TableCell className="text-right">{formatInr(row.taxableAmount)}</TableCell>
            <TableCell className="text-right">{formatInr(row.cgst)}</TableCell>
            <TableCell className="text-right">{formatInr(row.sgst)}</TableCell>
            <TableCell className="text-right">{formatInr(row.totalTax)}</TableCell>
          </TableRow>
        ))}
        <TableRow className="font-semibold">
          <TableCell>Total</TableCell>
          <TableCell className="text-right">{formatInr(totals.taxableAmount)}</TableCell>
          <TableCell className="text-right">{formatInr(totals.cgst)}</TableCell>
          <TableCell className="text-right">{formatInr(totals.sgst)}</TableCell>
          <TableCell className="text-right">{formatInr(totals.totalTax)}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

function VoucherTable({
  rows,
  emptyLabel,
  onOpen,
}: {
  rows: GstVoucherRow[];
  emptyLabel: string;
  onOpen: (row: GstVoucherRow) => void;
}) {
  if (rows.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  const totals = rows.reduce(
    (acc, row) => ({
      taxableAmount: acc.taxableAmount + row.taxableAmount,
      taxAmount: acc.taxAmount + row.taxAmount,
      invoiceAmount: acc.invoiceAmount + row.invoiceAmount,
    }),
    { taxableAmount: 0, taxAmount: 0, invoiceAmount: 0 }
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Particulars</TableHead>
          <TableHead>Vch Type</TableHead>
          <TableHead>Vch No.</TableHead>
          <TableHead className="text-right">Taxable Amount</TableHead>
          <TableHead className="text-right">Tax Amount</TableHead>
          <TableHead className="text-right">Invoice Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id} className="cursor-pointer" onClick={() => onOpen(row)}>
            <TableCell>{formatDisplayDate(row.date)}</TableCell>
            <TableCell>{row.particulars}</TableCell>
            <TableCell>{row.vchType}</TableCell>
            <TableCell>{row.vchNo}</TableCell>
            <TableCell className="text-right">{formatInr(row.taxableAmount)}</TableCell>
            <TableCell className="text-right">{formatInr(row.taxAmount)}</TableCell>
            <TableCell className="text-right">{formatInr(row.invoiceAmount)}</TableCell>
          </TableRow>
        ))}
        <TableRow className="font-semibold">
          <TableCell colSpan={4}>Total ({rows.length} voucher(s))</TableCell>
          <TableCell className="text-right">{formatInr(totals.taxableAmount)}</TableCell>
          <TableCell className="text-right">{formatInr(totals.taxAmount)}</TableCell>
          <TableCell className="text-right">{formatInr(totals.invoiceAmount)}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

export function GstPage() {
  const navigate = useNavigate();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [exporting, setExporting] = useState(false);
  const { data, isLoading } = useGstSummary(month, year);

  function shiftMonth(delta: number) {
    const date = new Date(year, month - 1 + delta, 1);
    setYear(date.getFullYear());
    setMonth(date.getMonth() + 1);
  }

  async function downloadGstr1Json() {
    setExporting(true);
    try {
      const { data: result } = await api.get<{
        filename: string;
        payload: unknown;
        meta: {
          b2bInvoiceCount: number;
          b2cInvoiceCount: number;
          skipped: { invoiceNo: string; reason: string }[];
          uploadHint: string;
        };
      }>("/gst/gstr1-json", { params: { month, year } });

      const blob = new Blob([JSON.stringify(result.payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);

      const parts = [
        `${result.meta.b2bInvoiceCount} B2B`,
        `${result.meta.b2cInvoiceCount} B2C`,
      ];
      if (result.meta.skipped.length > 0) {
        parts.push(`${result.meta.skipped.length} skipped`);
      }
      toast.success(`GSTR-1 JSON downloaded (${parts.join(", ")})`);
    } catch {
      toast.error("Failed to create GSTR-1 JSON");
    } finally {
      setExporting(false);
    }
  }

  function openGstPortal() {
    window.open(GST_RETURNS_LOGIN_URL, "_blank", "noopener,noreferrer");
    toast.message("GST Portal opened", {
      description:
        "Login → Returns Dashboard → select period → GSTR-1 → Prepare Offline → upload the JSON file.",
    });
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title="GST Summary"
        backTo="/"
        backLabel="Back to Dashboard"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => shiftMonth(-1)}>
              Prev
            </Button>
            <Input
              type="month"
              className="w-[10.5rem]"
              value={monthInputValue(year, month)}
              onChange={(e) => {
                const parsed = parseMonthInput(e.target.value);
                if (parsed) {
                  setYear(parsed.year);
                  setMonth(parsed.month);
                }
              }}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => shiftMonth(1)}>
              Next
            </Button>
          </div>
        }
      />

      {data?.period ? (
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="grid gap-1 text-sm">
                <p className="font-medium">
                  Tax period: {data.period.monthLabel} ({formatDisplayDate(data.period.from)} –{" "}
                  {formatDisplayDate(data.period.to)})
                </p>
                <p className="text-muted-foreground">
                  Like Tally: all sales bills of the month (1st–last day) go into GSTR-1.
                </p>
                <p className="text-muted-foreground">
                  Upload window:{" "}
                  <span className="font-medium text-foreground">
                    {formatDisplayDate(data.period.filingWindowFrom)} –{" "}
                    {formatDisplayDate(data.period.filingDueDate)}
                  </span>{" "}
                  (file by the 11th of next month).
                </p>
              </div>
              <Badge variant={filingBadgeVariant(data.period.filingStatus)}>
                {filingBadgeLabel(data.period.filingStatus)}
              </Badge>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                onClick={() => void downloadGstr1Json()}
                disabled={exporting || isLoading || (data.salesVoucherCount ?? 0) === 0}
              >
                <Download className="size-4" />
                {exporting ? "Creating JSON…" : "Create GSTR-1 JSON"}
              </Button>
              <Button type="button" variant="outline" onClick={openGstPortal}>
                <ExternalLink className="size-4" />
                Open GST Portal
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="sm:ml-auto"
                onClick={() => window.open(GST_PORTAL_URL, "_blank", "noopener,noreferrer")}
              >
                gst.gov.in
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Tally flow: Create JSON → Open GST Portal → Services → Returns → Returns Dashboard →
              select period → GSTR-1 → <strong>Prepare Offline</strong> → upload the downloaded
              file. Customers with GSTIN go to B2B; without GSTIN go to B2C summary.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sales vouchers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-semibold">{data?.salesVoucherCount ?? 0}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxable sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-semibold">
                {formatInr(data?.totalTaxableSales ?? 0)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Output GST (Sales)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-semibold">
                {formatInr(data?.totalOutputTax ?? 0)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net payable
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-semibold">{formatInr(data?.netPayable ?? 0)}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="gstr1">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="gstr1">GSTR-1 (Sales bills)</TabsTrigger>
          <TabsTrigger value="purchase">Purchases (Input)</TabsTrigger>
          <TabsTrigger value="rates">By GST rate</TabsTrigger>
        </TabsList>

        <TabsContent value="gstr1">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Pending for GSTR-1 — {data?.period.monthLabel ?? "…"}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Invoice-wise outward supplies for the tax month (Tally-style list). Click a row to
                open the invoice.
              </p>
            </CardHeader>
            <CardContent className="min-w-0">
              {isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <VoucherTable
                  rows={data?.gstr1Vouchers ?? []}
                  emptyLabel="No sales invoices in this month."
                  onOpen={(row) => navigate(`/sales/${row.id}`)}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="purchase">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Purchase bills — {data?.period.monthLabel ?? "…"}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Input GST from purchase bills dated in this month (for your own reconciliation;
                GSTR-1 is sales/outward only).
              </p>
            </CardHeader>
            <CardContent className="min-w-0">
              {isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <VoucherTable
                  rows={data?.purchaseVouchers ?? []}
                  emptyLabel="No purchase bills in this month."
                  onOpen={(row) => navigate(`/purchase/${row.id}`)}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rates">
          <div className="grid gap-4">
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>Output GST by rate</CardTitle>
              </CardHeader>
              <CardContent className="min-w-0">
                {isLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : (
                  <GstTable rows={data?.outputGst ?? []} />
                )}
              </CardContent>
            </Card>
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>Input GST by rate</CardTitle>
              </CardHeader>
              <CardContent className="min-w-0">
                {isLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : (
                  <GstTable rows={data?.inputGst ?? []} />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
