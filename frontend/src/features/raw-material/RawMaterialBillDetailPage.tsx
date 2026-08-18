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
import { formatInr } from "@/lib/formatInr";
import { canDelete } from "@/lib/permissions";
import { piecesFromKg } from "@/lib/rawMaterialYield";
import { useAuthStore } from "@/store/authStore";
import { RecordRawMaterialPaymentDialog } from "./RecordRawMaterialPaymentDialog";
import { useDeleteRawMaterialBill, useDeleteRawMaterialPayment, useRawMaterialBill } from "./useRawMaterial";

export function RawMaterialBillDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: bill, isLoading } = useRawMaterialBill(id);
  const deleteBill = useDeleteRawMaterialBill();
  const deletePayment = useDeleteRawMaterialPayment();
  const allowDelete = canDelete(useAuthStore((state) => state.user));
  const [paymentOpen, setPaymentOpen] = useState(false);
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

      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-muted-foreground">Bill total</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold tabular-nums">
            ₹{formatInr(bill.totalAmount)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-muted-foreground">Paid</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold tabular-nums">
            ₹{formatInr(bill.paidAmount)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm text-muted-foreground">Still to send</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <p className="text-xl font-semibold tabular-nums text-red-600">
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
        <Card>
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

      <div className="min-w-0 rounded-md border bg-card">
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
        <div className="flex items-center justify-between border-b px-4 py-2">
          <span className="text-sm font-medium">Payments sent</span>
          {bill.paymentStatus !== "PAID" ? (
            <Button size="sm" onClick={() => setPaymentOpen(true)}>
              <Banknote className="size-4" />
              Record payment
            </Button>
          ) : null}
        </div>
        {(bill.payments?.length ?? 0) === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">
            No payment recorded yet. Click Record payment when you send money to the supplier.
          </p>
        ) : (
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
                  <TableCell>{new Date(payment.paymentDate).toLocaleDateString("en-GB")}</TableCell>
                  <TableCell>{payment.mode}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatInr(payment.amount)}</TableCell>
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
        )}
      </div>

      <RecordRawMaterialPaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        billId={bill.id}
        billNo={bill.billNo}
        balanceAmount={bill.balanceAmount}
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
