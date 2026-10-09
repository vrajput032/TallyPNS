import { Banknote, Pencil, Printer, Share2, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MobilePaymentSentCards } from "@/features/payments/MobilePaymentSentCards";
import {
  dueAwareTileTone,
  paymentTileChipLabel,
  paymentTileClass,
  paymentTileInk,
} from "@/features/payments/paymentTile";
import { formatInr } from "@/lib/formatInr";
import { cn } from "@/lib/utils";
import { SaleTypeBadge } from "./TradingBadge";
import {
  daysUntilDue,
  invoiceQuantity,
  salesItemDescription,
  salesItemUnit,
  type SalesInvoice,
} from "./types";

export function MobileSalesInvoiceDetail({
  invoice,
  allowEdit,
  allowDelete,
  sharing,
  deleteReceiptPending,
  onPrint,
  onShare,
  onEdit,
  onDelete,
  onRecordReceipt,
  onDeleteReceipt,
}: {
  invoice: SalesInvoice;
  allowEdit: boolean;
  allowDelete: boolean;
  sharing: boolean;
  deleteReceiptPending: boolean;
  onPrint: () => void;
  onShare: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRecordReceipt: () => void;
  onDeleteReceipt: (receiptNo: string, receiptId: string) => void;
}) {
  const balance = invoice.balanceAmount ?? 0;
  const status = invoice.paymentStatus ?? "PENDING";
  const days = daysUntilDue(invoice);
  const tone = dueAwareTileTone({ status, balance, daysUntilDue: days });
  const ink = paymentTileInk(tone);
  const initial = invoice.customer.name.trim().charAt(0).toUpperCase() || "?";
  const receipts = invoice.receipts ?? [];

  return (
    <div className="grid min-w-0 gap-3 print:hidden">
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl border",
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

        <div className="relative flex items-center gap-3 p-4">
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-full bg-white/50 text-sm font-bold backdrop-blur-md dark:bg-black/20",
              ink.title
            )}
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className={cn("truncate font-semibold leading-tight", ink.title)}>
                {invoice.invoiceNo}
              </p>
              <div className="flex shrink-0 items-center gap-1.5">
                <SaleTypeBadge invoice={invoice} />
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide",
                    ink.chip
                  )}
                >
                  {paymentTileChipLabel(tone, days)}
                </span>
              </div>
            </div>
            <p className={cn("truncate text-sm", ink.meta)}>{invoice.customer.name}</p>
          </div>
        </div>

        <div className="relative mx-4 border-t border-black/10 dark:border-white/10" />

        <div className="relative flex items-center gap-2 p-4">
          <div className="flex flex-col items-center rounded-xl bg-white/45 px-3 py-1.5 backdrop-blur-md dark:bg-black/20">
            <span className={cn("text-base font-bold leading-none tabular-nums", ink.title)}>
              {invoiceQuantity(invoice).toLocaleString("en-IN")}
            </span>
            <span className={cn("mt-1 text-[10px] font-medium uppercase tracking-wider", ink.meta)}>
              {invoice.isRawMaterialTrading ? "Kg" : "Pcs"}
            </span>
          </div>
          <div className="min-w-0">
            <p className={cn("truncate text-lg font-bold leading-tight tabular-nums", ink.title)}>
              ₹{formatInr(invoice.totalAmount)}
            </p>
            <p className={cn("truncate text-xs", ink.meta)}>
              {new Date(invoice.invoiceDate).toLocaleDateString("en-GB")}
            </p>
          </div>
        </div>

        {balance > 0 ? (
          <div className={cn("relative flex items-center justify-between gap-2 px-4 py-3", ink.chip)}>
            <div className="min-w-0">
              <p className={cn("text-[10px] font-semibold uppercase tracking-wider", ink.meta)}>
                Balance due
              </p>
              <p className={cn("text-lg font-extrabold leading-tight tabular-nums", ink.title)}>
                ₹{formatInr(balance)}
              </p>
            </div>
            {days !== null ? (
              <span className={cn("shrink-0 rounded-full px-3 py-1.5 text-sm font-bold", ink.chip)}>
                {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today" : `${days}d left`}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" onClick={onPrint}>
          <Printer className="size-4" />
          Print
        </Button>
        <Button type="button" variant="outline" onClick={onShare} disabled={sharing}>
          <Share2 className="size-4" />
          {sharing ? "Sharing…" : "Share"}
        </Button>
      </div>

      {status !== "PAID" ? (
        <Button type="button" variant="outline" onClick={onRecordReceipt}>
          <Banknote className="size-4" />
          Record receipt
        </Button>
      ) : null}

      {allowEdit || allowDelete ? (
        <div className="flex gap-2">
          {allowEdit && receipts.length === 0 ? (
            <Button type="button" variant="outline" className="flex-1" onClick={onEdit}>
              <Pencil className="size-4" />
              Edit
            </Button>
          ) : null}
          {allowDelete ? (
            <Button type="button" variant="destructive" className="flex-1" onClick={onDelete}>
              <Trash2 className="size-4" />
              Delete
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-2 rounded-2xl border bg-card p-4 text-sm">
        <p>
          <span className="text-muted-foreground">GSTIN: </span>
          {invoice.customer.gstin || "Not registered"}
        </p>
        <p>
          <span className="text-muted-foreground">Transport: </span>
          {invoice.transport?.trim() || "—"}
        </p>
        <p>
          <span className="text-muted-foreground">Vehicle: </span>
          {invoice.vehicleNo?.trim() || "—"}
        </p>
        {invoice.customer.address ? (
          <p className="whitespace-pre-line">
            <span className="text-muted-foreground">Address: </span>
            {invoice.customer.address}
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <p className="border-b px-4 py-3 text-sm font-medium">Items</p>
        {invoice.items.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-3 border-b px-4 py-3">
            <div className="min-w-0">
              <p className="font-medium">{salesItemDescription(item)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {formatInr(Number(item.quantity))} {salesItemUnit(item)} · ₹{formatInr(item.rate)} · GST{" "}
                {Number(item.gstRate)}%
              </p>
            </div>
            <p className="shrink-0 font-semibold tabular-nums">
              ₹{formatInr(Number(item.quantity) * Number(item.rate))}
            </p>
          </div>
        ))}
        <div className="flex items-center justify-between bg-muted/40 px-4 py-3 font-semibold">
          <span>Total</span>
          <span className="tabular-nums">₹{formatInr(invoice.totalAmount)}</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-card">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <p className="text-sm font-medium">Receipts</p>
          {status !== "PAID" ? (
            <Button type="button" size="sm" variant="outline" onClick={onRecordReceipt}>
              <Banknote className="size-4" />
              Record
            </Button>
          ) : null}
        </div>
        {receipts.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">No receipt recorded yet.</p>
        ) : (
          <MobilePaymentSentCards
            payments={receipts.map((receipt) => ({
              id: receipt.id,
              paymentNo: receipt.receiptNo,
              paymentDate: receipt.receiptDate,
              mode: receipt.mode,
              amount: receipt.amount,
            }))}
            deletePending={deleteReceiptPending}
            onDelete={
              allowDelete
                ? (payment) => onDeleteReceipt(payment.paymentNo, payment.id)
                : undefined
            }
          />
        )}
      </div>

      {Number(invoice.commissionAmount ?? 0) > 0 ? (
        <p className="text-sm text-muted-foreground">
          Customer commission on this bill:{" "}
          <span className="font-medium text-foreground">₹{formatInr(invoice.commissionAmount)}</span> ·{" "}
          <Link to={`/commission/${invoice.customerId}`} className="text-primary underline-offset-2 hover:underline">
            View commission
          </Link>
        </p>
      ) : null}

      {invoice.isRawMaterialTrading && invoice.rawMaterialCostPerKg != null ? (
        <p className="text-sm text-muted-foreground">
          Raw material bought at{" "}
          <span className="font-medium text-foreground">₹{formatInr(invoice.rawMaterialCostPerKg)}/kg</span>{" "}
          before GST
        </p>
      ) : null}
    </div>
  );
}
