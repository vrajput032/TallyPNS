import { RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDeletePinDialog } from "@/components/ConfirmDeletePinDialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PurchaseBill } from "@/features/purchase/types";
import type { SalesInvoice } from "@/features/sales/types";
import { formatInr } from "@/lib/formatInr";
import {
  usePermanentDeletePurchaseBill,
  usePermanentDeleteSalesInvoice,
  useRecycleBin,
  useRestorePurchaseBill,
  useRestoreSalesInvoice,
} from "./useRecycleBin";

type PermanentDeleteTarget =
  | { type: "sales"; item: SalesInvoice }
  | { type: "purchase"; item: PurchaseBill };

function formatDeletedAt(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB");
}

export function RecycleBinPage() {
  const { data, isLoading } = useRecycleBin();
  const restoreSales = useRestoreSalesInvoice();
  const restorePurchase = useRestorePurchaseBill();
  const permanentDeleteSales = usePermanentDeleteSalesInvoice();
  const permanentDeletePurchase = usePermanentDeletePurchaseBill();
  const [permanentTarget, setPermanentTarget] = useState<PermanentDeleteTarget | null>(null);

  const sales = data?.sales ?? [];
  const purchase = data?.purchase ?? [];
  const isEmpty = !isLoading && sales.length === 0 && purchase.length === 0;

  function handleRestoreSales(invoice: SalesInvoice) {
    restoreSales.mutate(invoice.id, {
      onSuccess: () => toast.success(`Invoice ${invoice.invoiceNo} restored`),
      onError: (error: unknown) => {
        const message =
          (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          "Failed to restore invoice";
        toast.error(message);
      },
    });
  }

  function handleRestorePurchase(bill: PurchaseBill) {
    restorePurchase.mutate(bill.id, {
      onSuccess: () => toast.success(`Bill ${bill.billNo} restored`),
      onError: (error: unknown) => {
        const message =
          (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
          "Failed to restore bill";
        toast.error(message);
      },
    });
  }

  function confirmPermanentDelete(pin: string) {
    if (!permanentTarget) return;

    if (permanentTarget.type === "sales") {
      const { item } = permanentTarget;
      permanentDeleteSales.mutate(
        { id: item.id, pin },
        {
          onSuccess: () => {
            toast.success(`Invoice ${item.invoiceNo} permanently deleted`);
            setPermanentTarget(null);
          },
          onError: (error: unknown) => {
            const message =
              (error as { response?: { data?: { error?: string } } })?.response?.data?.error ??
              "Failed to delete invoice";
            toast.error(message);
          },
        }
      );
      return;
    }

    const { item } = permanentTarget;
    permanentDeletePurchase.mutate(
      { id: item.id, pin },
      {
        onSuccess: () => {
          toast.success(`Bill ${item.billNo} permanently deleted`);
          setPermanentTarget(null);
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

  const permanentPending = permanentDeleteSales.isPending || permanentDeletePurchase.isPending;

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Recycle Bin"
        backTo="/"
        backLabel="Back to Dashboard"
      />

      <p className="text-sm text-muted-foreground">
        Deleted sales invoices and purchase bills are kept here. Restore them or delete
        permanently (requires PIN).
      </p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : isEmpty ? (
        <div className="rounded-md border bg-card p-8 text-center text-sm text-muted-foreground">
          Recycle bin is empty.
        </div>
      ) : (
        <>
          {sales.length > 0 && (
            <div className="min-w-0 rounded-md border bg-card">
              <div className="border-b px-4 py-2 text-sm font-medium">Sales Invoices</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice No.</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Deleted</TableHead>
                    <TableHead className="w-32 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>{invoice.invoiceNo}</TableCell>
                      <TableCell>{invoice.customer.name}</TableCell>
                      <TableCell>
                        {new Date(invoice.invoiceDate).toLocaleDateString("en-GB")}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatInr(invoice.totalAmount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDeletedAt(invoice.deletedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="mr-1"
                          disabled={restoreSales.isPending}
                          onClick={() => handleRestoreSales(invoice)}
                        >
                          <RotateCcw className="size-4" />
                          Restore
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={permanentPending}
                          onClick={() => setPermanentTarget({ type: "sales", item: invoice })}
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {purchase.length > 0 && (
            <div className="min-w-0 rounded-md border bg-card">
              <div className="border-b px-4 py-2 text-sm font-medium">Purchase Bills</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill No.</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Deleted</TableHead>
                    <TableHead className="w-32 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchase.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell>{bill.billNo}</TableCell>
                      <TableCell>{bill.vendor.name}</TableCell>
                      <TableCell>
                        {new Date(bill.billDate).toLocaleDateString("en-GB")}
                      </TableCell>
                      <TableCell className="text-right">{formatInr(bill.totalAmount)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDeletedAt(bill.deletedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="mr-1"
                          disabled={restorePurchase.isPending}
                          onClick={() => handleRestorePurchase(bill)}
                        >
                          <RotateCcw className="size-4" />
                          Restore
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={permanentPending}
                          onClick={() => setPermanentTarget({ type: "purchase", item: bill })}
                        >
                          <Trash2 className="size-4" />
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      <ConfirmDeletePinDialog
        open={permanentTarget !== null}
        onOpenChange={(open) => !open && setPermanentTarget(null)}
        title={
          permanentTarget?.type === "sales"
            ? `Permanently delete ${permanentTarget.item.invoiceNo}?`
            : permanentTarget?.type === "purchase"
              ? `Permanently delete ${permanentTarget.item.billNo}?`
              : "Permanently delete?"
        }
        description="This cannot be undone. Enter the deletion PIN to permanently remove this record."
        confirmLabel="Delete permanently"
        isPending={permanentPending}
        onConfirm={confirmPermanentDelete}
      />
    </div>
  );
}
