import { Banknote, Pencil, Printer, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConfirmDeletePinDialog } from "@/components/ConfirmDeletePinDialog";
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
import { PurchaseBillPrint } from "./PurchaseBillPrint";
import { useDeletePurchaseBill, usePurchaseBill } from "./usePurchase";
import { formatInr } from "@/lib/formatInr";

export function PurchaseBillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: bill, isLoading } = usePurchaseBill(id);
  const deleteBill = useDeletePurchaseBill();
  const deletePayment = useDeleteVendorPayment();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isLoading || !bill) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
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
        className="print:hidden"
        title={bill.billNo}
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
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="size-4" />
              Print
            </Button>
            {(bill.payments?.length ?? 0) === 0 && (
              <Button variant="outline" onClick={() => navigate(`/purchase/${bill.id}/edit`)}>
                <Pencil className="size-4" />
                Edit
              </Button>
            )}
            <Button variant="destructive" onClick={() => setDeleteOpen(true)} disabled={deleteBill.isPending}>
              <Trash2 className="size-4" />
              Delete
            </Button>
          </>
        }
      />

      <div className="print:hidden grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {formatInr(bill.totalAmount)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Paid</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">{formatInr(bill.paidAmount)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Balance</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {formatInr(bill.balanceAmount)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentStatusBadge status={bill.paymentStatus} />
          </CardContent>
        </Card>
      </div>

      {(bill.payments?.length ?? 0) > 0 && (
        <div className="print:hidden min-w-0 rounded-md border bg-card">
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PurchaseBillPrint bill={bill} />

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
