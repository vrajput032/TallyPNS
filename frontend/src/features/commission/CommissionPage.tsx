import { Plus, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { TableSkeletonRows } from "@/components/loading/PageSkeletons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCustomers } from "@/features/customers/useCustomers";
import { monthInputValue, monthLabel, parseMonthInput } from "@/features/sales/salesMonthUtils";
import { formatInr } from "@/lib/formatInr";
import { cn } from "@/lib/utils";
import { formatCommissionRate } from "./commission";
import { LumpSumCommissionDialog } from "./LumpSumCommissionDialog";
import { PayCommissionDialog } from "./PayCommissionDialog";
import type { CommissionCustomerRow } from "./types";
import { useCommissionSummary } from "./useCommission";

function currentMonthValue() {
  const now = new Date();
  return monthInputValue(now.getFullYear(), now.getMonth() + 1);
}

export function CommissionPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const month = searchParams.get("month") ?? "";
  const parsedMonth = parseMonthInput(month);
  const { data, isLoading } = useCommissionSummary(parsedMonth ? month : undefined);
  const { data: customers } = useCustomers();
  const [lumpSumOpen, setLumpSumOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<CommissionCustomerRow | null>(null);

  const customerOptions = useMemo(
    () =>
      [...(customers ?? [])]
        .map((customer) => ({ id: customer.id, name: customer.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [customers]
  );
  const rows = data?.customers ?? [];
  const periodLabel = parsedMonth ? monthLabel(parsedMonth.year, parsedMonth.month) : "All time";

  function setMonth(value: string) {
    setSearchParams(value ? { month: value } : {}, { replace: true });
  }

  return (
    <div className="grid min-w-0 gap-4">
      <PageHeader
        title="Commission"
        backTo="/"
        backLabel="Back to Dashboard"
        actions={
          <Button onClick={() => setLumpSumOpen(true)}>
            <Plus className="size-4" />
            Add lump sum
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant={parsedMonth ? "outline" : "default"} onClick={() => setMonth("")}>
          All time
        </Button>
        <Button
          size="sm"
          variant={parsedMonth ? "default" : "outline"}
          onClick={() => setMonth(parsedMonth ? month : currentMonthValue())}
        >
          Month
        </Button>
        {parsedMonth ? (
          <Input
            type="month"
            className="w-[10.5rem]"
            value={month}
            onChange={(e) => parseMonthInput(e.target.value) && setMonth(e.target.value)}
          />
        ) : null}
      </div>

      <div className="grid min-w-0 grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: `Earned · ${periodLabel}`, value: data?.totals.earned ?? 0 },
          { label: `Paid · ${periodLabel}`, value: data?.totals.paid ?? 0 },
          { label: "Due now", value: data?.totals.due ?? 0 },
        ].map((stat) => (
          <Card key={stat.label} className="min-w-0 overflow-hidden">
            <CardHeader className="pb-1">
              <CardTitle className="truncate text-xs text-muted-foreground sm:text-sm">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent className="truncate text-sm font-semibold tabular-nums sm:text-xl">
              ₹{formatInr(stat.value)}
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        Rates are set per customer in{" "}
        <Link to="/customers" className="text-primary underline-offset-2 hover:underline">
          Customers
        </Link>{" "}
        (₹ per piece, % of bill before GST, or ₹ per bill). Factory bills only; trading bills earn no
        commission. Commission is a cost in Profit &amp; Loss; payouts show in the cash / bank book.
      </p>

      <div className="min-w-0 overflow-x-auto rounded-md border bg-card">
        <Table className="min-w-[48rem] text-xs sm:text-sm">
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead className="text-right">Bills</TableHead>
              <TableHead className="text-right">On bills</TableHead>
              <TableHead className="text-right">Lump sum</TableHead>
              <TableHead className="text-right">Earned</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Due now</TableHead>
              <TableHead className="w-24 text-right">Pay</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && !data ? (
              <TableSkeletonRows columns={9} />
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                  No customer has commission yet. Set a rate in Customers → Edit, or add a lump sum.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/commission/${row.id}`)}
                >
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatCommissionRate(row.commissionType, row.commissionRate)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.billCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatInr(row.billCommission)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatInr(row.lumpSum)}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{formatInr(row.earned)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatInr(row.paid)}</TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-semibold tabular-nums",
                      row.due > 0 ? "text-red-600" : "text-muted-foreground"
                    )}
                  >
                    {formatInr(row.due)}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={row.due <= 0}
                      onClick={() => setPayTarget(row)}
                    >
                      <Wallet className="size-3.5" />
                      Pay
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {rows.length > 0 ? (
            <TableFooter>
              <TableRow className="font-semibold">
                <TableCell colSpan={5}>Total</TableCell>
                <TableCell className="text-right tabular-nums">{formatInr(data?.totals.earned ?? 0)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatInr(data?.totals.paid ?? 0)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatInr(data?.totals.due ?? 0)}</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          ) : null}
        </Table>
      </div>

      <LumpSumCommissionDialog
        open={lumpSumOpen}
        onOpenChange={setLumpSumOpen}
        customers={customerOptions}
      />
      {payTarget ? (
        <PayCommissionDialog
          open
          onOpenChange={(open) => !open && setPayTarget(null)}
          customerId={payTarget.id}
          customerName={payTarget.name}
          due={payTarget.due}
        />
      ) : null}
    </div>
  );
}
