import { Badge } from "@/components/ui/badge";
import type { PaymentStatus } from "./types";

const LABELS: Record<PaymentStatus, string> = {
  PENDING: "Pending",
  PARTIAL: "Partial",
  PAID: "Paid",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const variant =
    status === "PAID" ? "default" : status === "PARTIAL" ? "secondary" : "outline";
  return <Badge variant={variant}>{LABELS[status]}</Badge>;
}
