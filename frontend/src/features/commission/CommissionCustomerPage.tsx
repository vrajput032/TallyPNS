import { Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { DetailSkeleton } from "@/components/loading/PageSkeletons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiErrorMessage } from "@/lib/apiError";
import { formatInr } from "@/lib/formatInr";
import { canDelete } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { formatCommissionRate } from "./commission";
import { LumpSumCommissionDialog, type LumpSumEditTarget } from "./LumpSumCommissionDialog";
import { PayCommissionDialog } from "./PayCommissionDialog";
import type { CommissionStatementRow } from "./types";
import {
  useCommissionStatement,
  useDeleteCommissionEntry,
  useDeleteCommissionPayment,
} from "./useCommission";

function RowActions({
  row,
  customerId,
  allowDelete,
  onEditLumpSum,
}: {
  row: CommissionStatementRow;
  customerId: string;
  allowDelete: boolean;
  onEditLumpSum: (target: LumpSumEditTarget) => void;
}) {
  const deleteEntry = useDeleteCommissionEntry();
  const deletePayment = useDeleteCommissionPayment();
  const onError = (error: unknown) => toast.error(apiErrorMessage(error, "Failed to delete"));

  switch (row.kind) {
    case "BILL":
      return row.href ? (
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link to={row.href} />}>
          Open bill
        </Button>
      ) : null;
    case "LUMP_SUM":
      return (
        <span className="inline-flex">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Edit lump sum"
            onClick={() =>
              onEditLumpSum({ id: row.id, month: row.month ?? "", amount: row.earned, note: row.note })
            }
          >
            <Pencil className="size-3.5" />
          </Button>
          {allowDelete ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Delete lump sum"
              onClick={() => {
                if (!confirm(`Delete ${row.description} (₹${formatInr(row.earned)})?`)) return;
                deleteEntry.mutate(
                  { id: row.id, customerId },
                  { onSuccess: () => toast.success("Lump sum deleted"), onError }
                );
              }}
            >
              <Trash2 className="size-3.5" />
            </Button>
          ) : null}
        </span>
      );
    case "PAYMENT":
      return allowDelete ? (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Delete payment"
          onClick={() => {
            if (!confirm(`Delete commission payment ${row.ref}?`)) return;
            deletePayment.mutate(
              { id: row.id, customerId },
              { onSuccess: () => toast.success(`Payment ${row.ref} deleted`), onError }
            );
          }}
        >
          <Trash2 className="size-3.5" />
        </Button>
      ) : null;
    default: {
      const _exhaustive: never = row.kind;
      return _exhaustive;
    }
  }
}

export function CommissionCustomerPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const { data, isLoading } = useCommissionStatement(customerId);
  const allowDelete = canDelete(useAuthStore((state) => state.user));
  const [payOpen, setPayOpen] = useState(false);
  const [lumpSumOpen, setLumpSumOpen] = useState(false);
  const [editingLumpSum, setEditingLumpSum] = useState<LumpSumEditTarget | null>(null);

  if (!customerId) return null;
  if (isLoading && !data) return <DetailSkeleton />;
  if (!data) return <p className="text-sm text-muted-foreground">Customer not found.</p>;

  const { customer, totals } = data;
  const rows = [...data.rows].reverse();

  return (
    <div className="grid min-w-0 gap-4">
      <PageHeader
        title={`Commission · ${customer.name}`}
        backTo="/commission"
        backLabel="Back to Commission"
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setEditingLumpSum(null);
                setLumpSumOpen(true);
              }}
            >
              <Plus className="size-4" />
              Add lump sum
            </Button>
            <Button onClick={() => setPayOpen(true)} disabled={totals.due <= 0}>
              <Wallet className="size-4" />
              Pay commission
            </Button>
          </>
        }
      />

      <p className="text-sm text-muted-foreground">
        Rate: <span className="font-medium text-foreground">{formatCommissionRate(customer.commissionType, customer.commissionRate)}</span>{" "}
        · change it in{" "}
        <Link to="/customers" className="text-primary underline-offset-2 hover:underline">
          Customers
        </Link>
        . A new rate applies to bills saved after the change.
      </p>

      <div className="grid min-w-0 grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: "Earned", value: totals.earned },
          { label: "Paid", value: totals.paid },
          { label: "Due", value: totals.due },
        ].map((stat) => (
          <Card key={stat.label} className="min-w-0 overflow-hidden">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground sm:text-sm">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent
              className={cn(
                "truncate text-sm font-semibold tabular-nums sm:text-xl",
                stat.label === "Due" && stat.value > 0 && "text-red-600"
              )}
            >
              ₹{formatInr(stat.value)}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="min-w-0 overflow-x-auto rounded-md border bg-card">
        <Table className="min-w-[44rem] text-xs sm:text-sm">
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Ref</TableHead>
              <TableHead>Details</TableHead>
              <TableHead className="text-right">Earned</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="w-28 text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No commission yet for this customer.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={`${row.kind}-${row.id}`}>
                  <TableCell>{new Date(row.date).toLocaleDateString("en-GB")}</TableCell>
                  <TableCell className="font-medium">{row.ref}</TableCell>
                  <TableCell className="max-w-[16rem]">
                    <span className="block truncate">{row.description}</span>
                    {row.note ? (
                      <span className="block truncate text-xs text-muted-foreground">{row.note}</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.earned > 0 ? formatInr(row.earned) : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.paid > 0 ? formatInr(row.paid) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{formatInr(row.balance)}</TableCell>
                  <TableCell className="text-right">
                    <RowActions
                      row={row}
                      customerId={customerId}
                      allowDelete={allowDelete}
                      onEditLumpSum={(target) => {
                        setEditingLumpSum(target);
                        setLumpSumOpen(true);
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PayCommissionDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        customerId={customer.id}
        customerName={customer.name}
        due={totals.due}
      />
      <LumpSumCommissionDialog
        open={lumpSumOpen}
        onOpenChange={setLumpSumOpen}
        customers={[{ id: customer.id, name: customer.name }]}
        customerId={customer.id}
        editing={editingLumpSum}
      />
    </div>
  );
}
