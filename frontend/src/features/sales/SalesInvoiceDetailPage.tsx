import { Banknote, Pencil, Printer, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
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
import { RecordReceiptDialog } from "@/features/payments/RecordReceiptDialog";
import { useDeleteReceipt } from "@/features/payments/usePayments";
import { SalesInvoicePrint } from "./SalesInvoicePrint";
import { useDeleteSalesInvoice, useSalesInvoice } from "./useSales";
import { formatInr } from "@/lib/formatInr";

export function SalesInvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: invoice, isLoading } = useSalesInvoice(id);
  const deleteInvoice = useDeleteSalesInvoice();
  const deleteReceipt = useDeleteReceipt();
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!invoice) return;

    const fileTitle = invoice.invoiceNo.replace(/[\\/:*?"<>|]+/g, "-");

    function handleBeforePrint() {
      document.title = fileTitle;
    }
    function handleAfterPrint() {
      document.title = "PNS ERP";
    }

    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
      document.title = "PNS ERP";
    };
  }, [invoice]);

  if (isLoading || !invoice) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  function handleDelete(pin: string) {
    if (!invoice) return;
    deleteInvoice.mutate(
      { id: invoice.id, pin },
      {
        onSuccess: () => {
          toast.success(`Invoice ${invoice.invoiceNo} moved to recycle bin`);
          setDeleteOpen(false);
          navigate("/sales");
        },
        onError: (error: unknown) => {
          const message =
            (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
            "Failed to delete invoice";
          toast.error(message);
        },
      }
    );
  }

  function handlePrint() {
    if (!invoice) return;
    document.title = invoice.invoiceNo.replace(/[\\/:*?"<>|]+/g, "-");
    window.print();
    document.title = "PNS ERP";
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        className="print:hidden"
        title={invoice.invoiceNo}
        backTo="/sales"
        backLabel="Back to Sales"
        actions={
          <>
            {invoice.paymentStatus !== "PAID" && (
              <Button variant="outline" onClick={() => setReceiptOpen(true)}>
                <Banknote className="size-4" />
                Record Receipt
              </Button>
            )}
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="size-4" />
              Print
            </Button>
            {(invoice.receipts?.length ?? 0) === 0 && (
              <Button variant="outline" onClick={() => navigate(`/sales/${invoice.id}/edit`)}>
                <Pencil className="size-4" />
                Edit
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
              disabled={deleteInvoice.isPending}
            >
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
            {formatInr(invoice.totalAmount)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Received</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {formatInr(invoice.paidAmount)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Balance</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {formatInr(invoice.balanceAmount)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <PaymentStatusBadge status={invoice.paymentStatus} />
          </CardContent>
        </Card>
      </div>

      {(invoice.receipts?.length ?? 0) > 0 && (
        <div className="print:hidden min-w-0 rounded-md border bg-card">
          <div className="border-b px-4 py-2 text-sm font-medium">Receipts</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt No.</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.receipts?.map((receipt) => (
                <TableRow key={receipt.id}>
                  <TableCell>{receipt.receiptNo}</TableCell>
                  <TableCell>
                    {new Date(receipt.receiptDate).toLocaleDateString("en-GB")}
                  </TableCell>
                  <TableCell>{receipt.mode}</TableCell>
                  <TableCell className="text-right">
                    {formatInr(receipt.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (!confirm(`Delete receipt ${receipt.receiptNo}?`)) return;
                        deleteReceipt.mutate(receipt.id, {
                          onSuccess: () => toast.success("Receipt deleted"),
                          onError: () => toast.error("Failed to delete receipt"),
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

      <SalesInvoicePrint invoice={invoice} />

      <RecordReceiptDialog
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        salesInvoiceId={invoice.id}
        invoiceNo={invoice.invoiceNo}
        balanceAmount={invoice.balanceAmount}
      />

      <ConfirmDeletePinDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Move invoice ${invoice.invoiceNo} to recycle bin?`}
        description="The invoice will be removed from Sales and can be restored from Recycle Bin. Enter the deletion PIN to confirm."
        isPending={deleteInvoice.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
