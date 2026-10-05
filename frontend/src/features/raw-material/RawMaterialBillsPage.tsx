import { Banknote, Eye, FileText, Paperclip, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConfirmDeletePinDialog } from "@/components/ConfirmDeletePinDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CardListSkeleton } from "@/components/loading/PageSkeletons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaymentStatusBadge } from "@/features/payments/PaymentStatusBadge";
import {
  PAYMENT_STATUS_LABEL,
  payableTileTone,
  paymentTileClass,
  paymentTileInk,
} from "@/features/payments/paymentTile";
import type { PaymentStatus } from "@/features/payments/types";
import { useIsMobile } from "@/hooks/useIsMobile";
import { formatInr } from "@/lib/formatInr";
import { canDelete } from "@/lib/permissions";
import { piecesFromKg } from "@/lib/rawMaterialYield";
import { apiErrorMessage } from "@/lib/apiError";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { RecordRawMaterialPaymentDialog } from "./RecordRawMaterialPaymentDialog";
import type { RawMaterialBill } from "./types";
import { useDeleteRawMaterialBill, useRawMaterialBills } from "./useRawMaterial";

function paymentRowClass(status: PaymentStatus) {
  switch (status) {
    case "PAID":
      return "bg-emerald-500/10 hover:bg-emerald-500/15";
    case "PARTIAL":
      return "bg-amber-400/20 hover:bg-amber-400/25";
    case "PENDING":
      return undefined;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function yieldLabel(bill: RawMaterialBill) {
  const rows = bill.yield?.length ? bill.yield : piecesFromKg(Number(bill.totalKg));
  return rows.map((row) => `${row.sizeMm}mm ${row.pieces.toLocaleString("en-IN")}`).join(" · ");
}

function formatBillDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB");
}

function lastPaymentDateLabel(bill: RawMaterialBill): string | null {
  const payments = bill.payments ?? [];
  if (payments.length === 0) return null;
  let latest = payments[0].paymentDate;
  for (const payment of payments) {
    if (payment.paymentDate > latest) latest = payment.paymentDate;
  }
  return formatBillDate(latest);
}

function BillCopyLink({ bill }: { bill: RawMaterialBill }) {
  const attachments = bill.attachments ?? [];
  const latest = attachments[0];
  if (!latest?.url) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <a
      href={latest.url}
      target="_blank"
      rel="noreferrer"
      title={latest.fileName}
      onClick={(event) => event.stopPropagation()}
      className="inline-flex items-center gap-1 text-sm text-primary underline-offset-2 hover:underline"
    >
      <Paperclip className="size-4" />
      Bill
      {attachments.length > 1 ? (
        <span className="text-xs text-muted-foreground">+{attachments.length - 1}</span>
      ) : null}
    </a>
  );
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
        const status = bill.paymentStatus ?? "PENDING";
        const lastPaid = lastPaymentDateLabel(bill);
        const tone = payableTileTone(status);
        const ink = paymentTileInk(tone);
        return (
          <div
            key={bill.id}
            onClick={() => onView(bill)}
            className={cn(
              "relative overflow-hidden rounded-3xl border active:scale-[0.99]",
              paymentTileClass(tone)
            )}
          >
            <div
              className={cn(
                "pointer-events-none absolute -right-10 -top-12 size-36 rounded-full blur-2xl",
                ink.glow
              )}
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/25" />

            <div className="relative flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={cn("truncate text-xl font-semibold leading-tight tracking-tight", ink.title)}>
                    {bill.supplierName}
                  </p>
                  {lastPaid ? (
                    <p className={cn("mt-1 text-sm", ink.meta)}>Last paid {lastPaid}</p>
                  ) : null}
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide",
                    ink.chip
                  )}
                >
                  {PAYMENT_STATUS_LABEL[status]}
                </span>
              </div>

              <div>
                <p className={cn("text-[2rem] font-bold leading-none tracking-tight tabular-nums", ink.title)}>
                  ₹{formatInr(bill.totalAmount)}
                </p>
                <p className={cn("mt-2 text-sm font-medium", ink.meta)}>
                  {Number(bill.totalKg).toLocaleString("en-IN")} kg
                  {balance > 0 ? (
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      {" "}
                      · ₹{formatInr(balance)} left
                    </span>
                  ) : null}
                </p>
                <p className={cn("mt-1 text-sm", ink.meta)}>{yieldLabel(bill)}</p>
              </div>

              <div className="flex items-end justify-between gap-2">
                {(bill.attachments?.length ?? 0) > 0 ? <BillCopyLink bill={bill} /> : <span />}
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
          </div>
        );
      })}
    </div>
  );
}

export function RawMaterialBillsPage() {
  const { data: bills, isLoading, isError, refetch } = useRawMaterialBills();
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
          toast.error(apiErrorMessage(error, "Failed to delete bill"));
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
          <>
            <Button
              variant="outline"
              onClick={() => navigate("/raw-material/print-totals")}
              disabled={(bills ?? []).length === 0}
            >
              <FileText className="size-4" />
              Download PDF
            </Button>
            <Button onClick={() => navigate("/raw-material/new")}>
              <Plus className="size-4" />
              Add bill
            </Button>
          </>
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

      {isError ? (
        <div className="rounded-md border border-destructive/30 bg-card p-4 text-sm">
          <p className="font-medium">Could not load raw material bills.</p>
          <p className="mt-1 text-muted-foreground">
            If you are in the installed app, close it fully and open it again so it can refresh.
          </p>
          <Button className="mt-3" variant="outline" size="sm" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : isLoading ? (
        isMobile ? <CardListSkeleton /> : <Skeleton className="h-40 w-full rounded-xl" />
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
                <TableHead>Last paid</TableHead>
                <TableHead>Bill</TableHead>
                <TableHead className="w-40 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(bills ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground">
                    No raw material bills yet. Upload a supplier invoice to start.
                  </TableCell>
                </TableRow>
              ) : (
                (bills ?? []).map((bill) => {
                  const yield95 = bill.yield?.find((row) => row.sizeMm === 95)?.pieces ?? 0;
                  const yield110 = bill.yield?.find((row) => row.sizeMm === 110)?.pieces ?? 0;
                  const status = bill.paymentStatus ?? "PENDING";
                  return (
                    <TableRow key={bill.id} className={paymentRowClass(status)}>
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
                      <TableCell className="tabular-nums text-muted-foreground">
                        {lastPaymentDateLabel(bill) ?? "—"}
                      </TableCell>
                      <TableCell>
                        <BillCopyLink bill={bill} />
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
