import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatInr } from "@/lib/formatInr";

export interface PaymentSentRow {
  id: string;
  paymentNo: string;
  paymentDate: string;
  mode: string;
  amount: string | number;
}

interface MobilePaymentSentCardsProps {
  payments: PaymentSentRow[];
  onEdit?: (payment: PaymentSentRow) => void;
  onDelete?: (payment: PaymentSentRow) => void;
  deletePending?: boolean;
}

export function MobilePaymentSentCards({
  payments,
  onEdit,
  onDelete,
  deletePending,
}: MobilePaymentSentCardsProps) {
  return (
    <div className="grid gap-3 p-3">
      {payments.map((payment) => (
        <div
          key={payment.id}
          className="overflow-hidden rounded-2xl border bg-card shadow-sm active:scale-[0.99]"
        >
          <div className="flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="truncate font-semibold">{payment.paymentNo}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {new Date(payment.paymentDate).toLocaleDateString("en-GB")}
              </p>
              <span className="mt-2 inline-block rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                {payment.mode}
              </span>
            </div>
            <p className="shrink-0 text-xl font-bold tabular-nums">₹{formatInr(payment.amount)}</p>
          </div>
          {onEdit || onDelete ? (
            <>
              <div className="mx-4 border-t" />
              <div className="flex justify-end gap-1 p-2">
                {onEdit ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11"
                    aria-label={`Edit payment ${payment.paymentNo}`}
                    onClick={() => onEdit(payment)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                ) : null}
                {onDelete ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11"
                    aria-label={`Delete payment ${payment.paymentNo}`}
                    disabled={deletePending}
                    onClick={() => onDelete(payment)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      ))}
    </div>
  );
}
