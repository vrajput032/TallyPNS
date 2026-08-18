import { Banknote, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConfirmDeletePinDialog } from "@/components/ConfirmDeletePinDialog";
import { Button } from "@/components/ui/button";
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
import { PaymentStatusBadge } from "@/features/payments/PaymentStatusBadge";
import { useIsMobile } from "@/hooks/useIsMobile";
import { formatInr } from "@/lib/formatInr";
import { canDelete } from "@/lib/permissions";
import { piecesFromKg } from "@/lib/rawMaterialYield";
import { useAuthStore } from "@/store/authStore";
import { RecordRawMaterialPaymentDialog } from "./RecordRawMaterialPaymentDialog";
import type { RawMaterialBill } from "./types";
import { useDeleteRawMaterialBill, useRawMaterialBills } from "./useRawMaterial";

function yieldLabel(bill: RawMaterialBill) {
  const rows = bill.yield?.length ? bill.yield : piecesFromKg(Number(bill.totalKg));
  return rows.map((row) => `${row.sizeMm}mm ${row.pieces.toLocaleString("en-IN")}`).join(" · ");
}

function MobileBillCards({
  bills,
  allowDelete,
  onView,
  onEdit,
  onPay,
  onDelete,
}: {
  bills: RawMaterialBill[];
  allowDelete: boolean;
  onView: (bill: RawMaterialBill) => void;
  onEdit: (bill: RawMaterialBill) => void;
  onPay: (bill: RawMaterialBill) => void;
  onDelete: (bill: RawMaterialBill) => void;
}) {
  if (bills.length === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">No raw material bills yet.</p>;
  }

  return (
    <div className="grid gap-3">
      {bills.map((bill) => {
        const balance = bill.balanceAmount ?? 0;
        return (
          <div
            key={bill.id}
            onClick={() => onView(bill)}
            className="overflow-hidden rounded-2xl border bg-card shadow-sm active:scale-[0.99]"
          >
            <div className="flex items-start justify-between gap-2 p-4">
              <div className="min-w-0">
                <p className="truncate font-semibold">{bill.billNo}</p>
                <p className="truncate text-sm text-muted-foreground">{bill.supplierName}</p>
              </div>
              <PaymentStatusBadge status={bill.paymentStatus ?? "PENDING"} />
            </div>
            <div className="mx-4 border-t" />
            <div className="flex items-end justify-between gap-2 p-4">
              <div>
                <p className="text-lg font-bold tabular-nums">₹{formatInr(bill.totalAmount)}</p>
                <p className="text-xs text-muted-foreground">
                  {Number(bill.totalKg).toLocaleString("en-IN")} kg
                  {balance > 0 ? (
                    <span className="font-medium text-red-600"> · ₹{formatInr(balance)} left</span>
                  ) : null}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">{yieldLabel(bill)}</p>
              </div>
              <div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
                {balance > 0 ? (
                  <Button size="sm" onClick={() => onPay(bill)}>
                    <Banknote className="size-4" />
                    Pay
                  </Button>
                ) : null}
                {(bill.payments?.length ?? 0) === 0 && (
                  <Button variant="ghost" size="icon" onClick={() => onEdit(bill)}>
                    <Pencil className="size-4" />
                  </Button>
                )}
                {allowDelete ? (
                  <Button variant="ghost" size="icon" onClick={() => onDelete(bill)}>
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function RawMaterialBillsPage() {
  const { data: bills, isLoading } = useRawMaterialBills();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const allowDelete = canDelete(useAuthStore((state) => state.user));
  const deleteBill = useDeleteRawMaterialBill();
  const [deleteTarget, setDeleteTarget] = useState<RawMaterialBill | null>(null);
  const [payTarget, setPayTarget] = useState<RawMaterialBill | null>(null);

  const totals = useMemo(() => {
    const list = bills ?? [];
    const paidAmount = list.reduce((sum, bill) => sum + Number(bill.paidAmount ?? 0), 0);
    const balanceAmount = list.reduce((sum, bill) => sum + Number(bill.balanceAmount ?? 0), 0);
    const totalKg = list.reduce((sum, bill) => sum + Number(bill.totalKg), 0);
    return { paidAmount, balanceAmount, totalKg, yield: piecesFromKg(totalKg) };
  }, [bills]);

  function confirmDelete(pin: string) {
    if (!deleteTarget) return;
    deleteBill.mutate(
      { id: deleteTarget.id, pin },
      {
        onSuccess: () => {
          toast.success(`Bill ${deleteTarget.billNo} deleted`);
          setDeleteTarget(null);
        },
        onError: (error: unknown) => {
          const message =
            (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
            "Failed to delete bill";
          toast.error(message);
        },
      }
    );
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Raw material"
        backTo="/"
        backLabel="Back to Dashboard"
        actions={
          <Button onClick={() => navigate("/raw-material/new")}>
            <Plus className="size-4" />
            Add bill
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-muted-foreground">Still to send</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold tabular-nums text-red-600">
            ₹{formatInr(totals.balanceAmount)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-muted-foreground">Paid</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold tabular-nums">
            ₹{formatInr(totals.paidAmount)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-muted-foreground">Steel in (kg)</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold tabular-nums">
            {totals.totalKg.toLocaleString("en-IN")}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-muted-foreground">Can make</CardTitle>
          </CardHeader>
          <CardContent className="text-sm font-medium leading-snug">
            {totals.yield.map((row) => (
              <div key={row.sizeMm}>
                {row.sizeMm}mm · {row.pieces.toLocaleString("en-IN")} pcs
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : isMobile ? (
        <MobileBillCards
          bills={bills ?? []}
          allowDelete={allowDelete}
          onView={(bill) => navigate(`/raw-material/${bill.id}`)}
          onEdit={(bill) => navigate(`/raw-material/${bill.id}/edit`)}
          onPay={setPayTarget}
          onDelete={setDeleteTarget}
        />
      ) : (
        <div className="min-w-0 rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill No.</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Kg</TableHead>
                <TableHead>Pieces (95 / 110)</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Left to pay</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-40 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(bills ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    No raw material bills yet. Upload a supplier invoice to start.
                  </TableCell>
                </TableRow>
              ) : (
                (bills ?? []).map((bill) => {
                  const yield95 = bill.yield?.find((row) => row.sizeMm === 95)?.pieces ?? 0;
                  const yield110 = bill.yield?.find((row) => row.sizeMm === 110)?.pieces ?? 0;
                  return (
                    <TableRow key={bill.id}>
                      <TableCell className="font-medium">{bill.billNo}</TableCell>
                      <TableCell>{new Date(bill.billDate).toLocaleDateString("en-GB")}</TableCell>
                      <TableCell>{bill.supplierName}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {Number(bill.totalKg).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">
                        {yield95.toLocaleString("en-IN")} / {yield110.toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatInr(bill.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        {formatInr(bill.balanceAmount ?? 0)}
                      </TableCell>
                      <TableCell>
                        <PaymentStatusBadge status={bill.paymentStatus ?? "PENDING"} />
                      </TableCell>
                      <TableCell className="text-right">
                        {(bill.balanceAmount ?? 0) > 0 ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mr-1"
                            onClick={() => setPayTarget(bill)}
                          >
                            <Banknote className="size-4" />
                            Pay
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/raw-material/${bill.id}`)}
                        >
                          <Eye className="size-4" />
                        </Button>
                        {(bill.payments?.length ?? 0) === 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/raw-material/${bill.id}/edit`)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                        )}
                        {allowDelete ? (
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(bill)}>
                            <Trash2 className="size-4" />
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <RecordRawMaterialPaymentDialog
        open={payTarget !== null}
        onOpenChange={(open) => !open && setPayTarget(null)}
        billId={payTarget?.id ?? ""}
        billNo={payTarget?.billNo ?? ""}
        balanceAmount={payTarget?.balanceAmount ?? 0}
      />

      <ConfirmDeletePinDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={deleteTarget ? `Delete bill ${deleteTarget.billNo}?` : "Delete bill?"}
        description="This removes the supplier bill and its kg / piece calculation. Enter the deletion PIN to confirm."
        isPending={deleteBill.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
