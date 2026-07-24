import { PageHeader } from "@/components/layout/PageHeader";
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
import { useGstSummary, type GstRateBreakdown } from "./useGstSummary";

function GstTable({ rows }: { rows: GstRateBreakdown[] }) {
  if (rows.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">No data.</p>;
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
            <TableCell className="text-right">{row.taxableAmount.toFixed(2)}</TableCell>
            <TableCell className="text-right">{row.cgst.toFixed(2)}</TableCell>
            <TableCell className="text-right">{row.sgst.toFixed(2)}</TableCell>
            <TableCell className="text-right">{row.totalTax.toFixed(2)}</TableCell>
          </TableRow>
        ))}
        <TableRow className="font-semibold">
          <TableCell>Total</TableCell>
          <TableCell className="text-right">{totals.taxableAmount.toFixed(2)}</TableCell>
          <TableCell className="text-right">{totals.cgst.toFixed(2)}</TableCell>
          <TableCell className="text-right">{totals.sgst.toFixed(2)}</TableCell>
          <TableCell className="text-right">{totals.totalTax.toFixed(2)}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

export function GstPage() {
  const { data, isLoading } = useGstSummary();

  return (
    <div className="grid gap-4">
      <PageHeader title="GST Summary" backTo="/" backLabel="Back to Dashboard" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                {(data?.totalOutputTax ?? 0).toFixed(2)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Input GST (Purchase)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-semibold">
                {(data?.totalInputTax ?? 0).toFixed(2)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Payable
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-semibold">{(data?.netPayable ?? 0).toFixed(2)}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Output GST by Rate</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          <GstTable rows={data?.outputGst ?? []} />
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Input GST by Rate</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          <GstTable rows={data?.inputGst ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
