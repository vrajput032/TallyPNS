import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeletonRows } from "@/components/loading/PageSkeletons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatInr } from "@/lib/formatInr";
import type { CashBankBook } from "./types";

export function CashBankBookPage({
  title,
  data,
  isLoading,
}: {
  title: string;
  data: CashBankBook | undefined;
  isLoading: boolean;
}) {
  return (
    <div className="grid gap-4">
      <PageHeader title={title} backTo="/" backLabel="Back to Dashboard" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {isLoading ? <Skeleton className="h-8 w-28" /> : formatInr(data?.totalIn ?? 0)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Out</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {isLoading ? <Skeleton className="h-8 w-28" /> : formatInr(data?.totalOut ?? 0)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Closing Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {isLoading ? <Skeleton className="h-8 w-28" /> : formatInr(data?.closingBalance ?? 0)}
          </CardContent>
        </Card>
      </div>

      <div className="min-w-0 rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Voucher</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Party</TableHead>
              <TableHead>Against</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeletonRows columns={6} />
            ) : (data?.entries.length ?? 0) === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No transactions yet. Record receipts/payments from invoices.
                </TableCell>
              </TableRow>
            ) : (
              data?.entries.map((entry) => (
                <TableRow key={`${entry.source}-${entry.id}`}>
                  <TableCell>
                    {new Date(entry.date).toLocaleDateString("en-GB")}
                  </TableCell>
                  <TableCell>{entry.voucherNo}</TableCell>
                  <TableCell>{entry.kind === "IN" ? "Receipt" : "Payment"}</TableCell>
                  <TableCell>{entry.party}</TableCell>
                  <TableCell>{entry.against}</TableCell>
                  <TableCell className="text-right">
                    {entry.kind === "IN" ? "+" : "-"}
                    {formatInr(entry.amount)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
