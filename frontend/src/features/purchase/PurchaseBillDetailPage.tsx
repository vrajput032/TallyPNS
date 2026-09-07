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
import { RecordPaymentDialog } from "@/features/payments/RecordPaymentDialog";
import { useDeleteVendorPayment } from "@/features/payments/usePayments";
import { PurchaseAttachmentsPanel } from "./PurchaseAttachmentsPanel";
import { useDeletePurchaseBill, usePurchaseBill } from "./usePurchase";
import { purchaseLineLabel, purchaseBillTitle } from "./types";
import { formatInr } from "@/lib/formatInr";
import { canDelete } from "@/lib/permissions";
import { useAuthStore } from "@/store/authStore";

export function PurchaseBillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: bill, isLoading } = usePurchaseBill(id);
  const deleteBill = useDeletePurchaseBill();
  const deletePayment = useDeleteVendorPayment();
  const allowDelete = canDelete(useAuthStore((state) => state.user));
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isLoading || !bill) {
    return <DetailSkeleton />;
  }

  function handleDelete(pin: string) {
    if (!bill) return;
    deleteBill.mutate(
      { id: bill.id, pin },
      {
        onSuccess: () => {
          toast.success(`Bill ${bill.billNo} moved to recycle bin`);
          setDeleteOpen(false);
          navigate("/purchase");
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
        title={purchaseBillTitle(bill)}
        backTo="/purchase"
        backLabel="Back to Purchase"
        actions={
          <>
            {bill.paymentStatus !== "PAID" && (
              <Button variant="outline" onClick={() => setPaymentOpen(true)}>
                <Banknote className="size-4" />
                Record Payment
              </Button>
            )}
            {(bill.payments?.length ?? 0) === 0 && (
              <Button variant="outline" onClick={() => navigate(`/purchase/${bill.id}/edit`)}>
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
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent className="truncate text-base font-semibold tabular-nums sm:text-xl">
            {formatInr(bill.totalAmount)}
          </CardContent>
        </Card>
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Paid</CardTitle>
          </CardHeader>
          <CardContent className="truncate text-base font-semibold tabular-nums sm:text-xl">
            {formatInr(bill.paidAmount)}
          </CardContent>
        </Card>
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Balance</CardTitle>
          </CardHeader>
          <CardContent className="truncate text-base font-semibold tabular-nums sm:text-xl">
            {formatInr(bill.balanceAmount)}
          </CardContent>
        </Card>
        <Card className="min-w-0 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentStatusBadge status={bill.paymentStatus} />
          </CardContent>
        </Card>
      </div>

      {(bill.payments?.length ?? 0) > 0 && (
        <div className="min-w-0 overflow-x-auto rounded-md border bg-card">
          <div className="border-b px-4 py-2 text-sm font-medium">Payments</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment No.</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {bill.payments?.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{payment.paymentNo}</TableCell>
                  <TableCell>
                    {new Date(payment.paymentDate).toLocaleDateString("en-GB")}
                  </TableCell>
                  <TableCell>{payment.mode}</TableCell>
                  <TableCell className="text-right">
                    {formatInr(payment.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {allowDelete ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (!confirm(`Delete payment ${payment.paymentNo}?`)) return;
                          deletePayment.mutate(payment.id, {
                            onSuccess: () => toast.success("Payment deleted"),
                            onError: () => toast.error("Failed to delete payment"),
                          });
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bill file</CardTitle>
        </CardHeader>
        <CardContent>
          <PurchaseAttachmentsPanel billId={bill.id} attachments={bill.attachments} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            {bill.title?.trim() ? (
              <span>
                <span className="text-muted-foreground">Title: </span>
                {bill.title}
              </span>
            ) : null}
            <span>
              <span className="text-muted-foreground">Ref: </span>
              {bill.billNo}
            </span>
            {bill.supplierInvoiceNo ? (
              <span>
                <span className="text-muted-foreground">Invoice: </span>
                {bill.supplierInvoiceNo}
              </span>
            ) : null}
            {bill.supplierGstin ? (
              <span>
                <span className="text-muted-foreground">GSTIN: </span>
                {bill.supplierGstin}
              </span>
            ) : null}
          </div>
          {bill.notes ? <p className="whitespace-pre-wrap">{bill.notes}</p> : null}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bill.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{purchaseLineLabel(item)}</TableCell>
                    <TableCell className="text-right">{Number(item.quantity).toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right">{formatInr(item.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <RecordPaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        purchaseBillId={bill.id}
        billNo={bill.billNo}
        balanceAmount={bill.balanceAmount}
      />

      <ConfirmDeletePinDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Move bill ${bill.billNo} to recycle bin?`}
        description="The bill will be removed from Purchase and can be restored from Recycle Bin. Enter the deletion PIN to confirm."
        isPending={deleteBill.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
