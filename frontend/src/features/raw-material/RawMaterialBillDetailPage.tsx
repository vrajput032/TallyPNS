import { Banknote, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConfirmDeletePinDialog } from "@/components/ConfirmDeletePinDialog";
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
import { PaymentStatusBadge } from "@/features/payments/PaymentStatusBadge";
import { MobilePaymentSentCards } from "@/features/payments/MobilePaymentSentCards";
import { formatInr } from "@/lib/formatInr";
import { useIsMobile } from "@/hooks/useIsMobile";
import { canDelete } from "@/lib/permissions";
import { piecesFromKg } from "@/lib/rawMaterialYield";
import { useAuthStore } from "@/store/authStore";
import type { RawMaterialPayment } from "./types";
import { RecordRawMaterialPaymentDialog } from "./RecordRawMaterialPaymentDialog";
import { useDeleteRawMaterialBill, useDeleteRawMaterialPayment, useRawMaterialBill } from "./useRawMaterial";

export function RawMaterialBillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: bill, isLoading } = useRawMaterialBill(id);
  const deleteBill = useDeleteRawMaterialBill();
  const deletePayment = useDeleteRawMaterialPayment();
  const allowDelete = canDelete(useAuthStore((state) => state.user));
  const isMobile = useIsMobile();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [editPayment, setEditPayment] = useState<RawMaterialPayment | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isLoading || !bill) {
    return <DetailSkeleton />;
  }

  const yieldRows = bill.yield?.length ? bill.yield : piecesFromKg(Number(bill.totalKg));

  function handleDelete(pin: string) {
    if (!bill) return;
    deleteBill.mutate(
      { id: bill.id, pin },
      {
        onSuccess: () => {
          toast.success(`Bill ${bill.billNo} deleted`);
          setDeleteOpen(false);
          navigate("/raw-material");
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
        title={bill.billNo}
        backTo="/raw-material"
        backLabel="Back"
        actions={
          <>
            {bill.paymentStatus !== "PAID" && (
              <Button onClick={() => setPaymentOpen(true)}>
                <Banknote className="size-4" />
                Record payment
              </Button>
            )}
            {(bill.payments?.length ?? 0) === 0 && (
              <Button variant="outline" onClick={() => navigate(`/raw-material/${bill.id}/edit`)}>
                <Pencil className="size-4" />
                Edit
              </Button>
            )}
            {allowDelete ? (
              <Button variant="destructive" onClick={() => setDeleteOpen(true)} disabled={deleteBill.isPending}>
                <Trash2 className="size-4" />
                Delete
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-muted-foreground">Bill total</CardTitle>
          </CardHeader>
          <CardContent className="truncate text-base font-semibold tabular-nums sm:text-xl">
            ₹{formatInr(bill.totalAmount)}
          </CardContent>
        </Card>
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-muted-foreground">Paid</CardTitle>
          </CardHeader>
          <CardContent className="truncate text-base font-semibold tabular-nums sm:text-xl">
            ₹{formatInr(bill.paidAmount)}
          </CardContent>
        </Card>
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-muted-foreground">Still to send</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <p className="truncate text-base font-semibold tabular-nums text-red-600 sm:text-xl">
              ₹{formatInr(bill.balanceAmount)}
            </p>
            {bill.paymentStatus !== "PAID" ? (
              <Button size="sm" onClick={() => setPaymentOpen(true)}>
                <Banknote className="size-4" />
                Record payment
              </Button>
            ) : null}
          </CardContent>
        </Card>
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentStatusBadge status={bill.paymentStatus} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Supplier</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1 text-sm sm:grid-cols-2">
          <p>
            <span className="text-muted-foreground">Name: </span>
            {bill.supplierName}
          </p>
          <p>
            <span className="text-muted-foreground">GSTIN: </span>
            {bill.supplierGstin || "—"}
          </p>
          <p>
            <span className="text-muted-foreground">Date: </span>
            {new Date(bill.billDate).toLocaleDateString("en-GB")}
          </p>
          <p>
            <span className="text-muted-foreground">Vehicle: </span>
            {bill.vehicleNo || "—"}
          </p>
        </CardContent>
      </Card>

      <div className="min-w-0 overflow-x-auto rounded-md border bg-card">
        <div className="border-b px-4 py-2 text-sm font-medium">Items</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Kg</TableHead>
              <TableHead className="text-right">₹ / kg</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bill.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.description}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {Number(item.quantityKg).toLocaleString("en-IN")}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatInr(item.ratePerKg)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatInr(item.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pieces this steel can make</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {yieldRows.map((row) => (
            <div key={row.sizeMm} className="rounded-lg bg-muted px-3 py-3">
              <p className="text-sm text-muted-foreground">{row.sizeMm}mm ({row.piecesPerKg} / kg)</p>
              <p className="text-xl font-semibold tabular-nums">
                {row.pieces.toLocaleString("en-IN")} pcs
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="min-w-0 rounded-md border bg-card">
        <div className="flex flex-col gap-2 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-medium">Payments sent</span>
          {bill.paymentStatus !== "PAID" ? (
            <Button size="sm" className="w-full sm:w-auto" onClick={() => setPaymentOpen(true)}>
              <Banknote className="size-4" />
              Record payment
            </Button>
          ) : null}
        </div>
        {(bill.payments?.length ?? 0) === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No payment recorded yet. Click Record payment when you send money to the supplier.
          </p>
        ) : isMobile ? (
          <MobilePaymentSentCards
            payments={bill.payments ?? []}
            deletePending={deletePayment.isPending}
            onEdit={(payment) => {
              const match = bill.payments?.find((row) => row.id === payment.id);
              if (!match) return;
              setEditPayment(match);
              setPaymentOpen(true);
            }}
            onDelete={(payment) => {
              if (!confirm(`Delete payment ${payment.paymentNo}?`)) return;
              deletePayment.mutate(payment.id, {
                onSuccess: () => toast.success("Payment deleted"),
                onError: (error: unknown) => {
                  const message =
                    (error as { response?: { data?: { error?: string } } })?.response?.data
                      ?.error ?? "Failed to delete payment";
                  toast.error(message);
                },
              });
            }}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment No.</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bill.payments?.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{payment.paymentNo}</TableCell>
                  <TableCell>{new Date(payment.paymentDate).toLocaleDateString("en-GB")}</TableCell>
                  <TableCell>{payment.mode}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatInr(payment.amount)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit payment ${payment.paymentNo}`}
                        onClick={() => {
                          setEditPayment(payment);
                          setPaymentOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete payment ${payment.paymentNo}`}
                        disabled={deletePayment.isPending}
                        onClick={() => {
                          if (!confirm(`Delete payment ${payment.paymentNo}?`)) return;
                          deletePayment.mutate(payment.id, {
                            onSuccess: () => toast.success("Payment deleted"),
                            onError: (error: unknown) => {
                              const message =
                                (error as { response?: { data?: { error?: string } } })?.response
                                  ?.data?.error ?? "Failed to delete payment";
                              toast.error(message);
                            },
                          });
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <RecordRawMaterialPaymentDialog
        open={paymentOpen}
        onOpenChange={(open) => {
          setPaymentOpen(open);
          if (!open) setEditPayment(null);
        }}
        billId={bill.id}
        billNo={bill.billNo}
        balanceAmount={bill.balanceAmount}
        payment={editPayment}
      />

      <ConfirmDeletePinDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete bill ${bill.billNo}?`}
        description="This permanently removes the supplier bill. Enter the deletion PIN to confirm."
        isPending={deleteBill.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
