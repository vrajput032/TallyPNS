import { ArrowLeftRight, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SalesInvoice } from "./types";

export function TradingBadge() {
  return (
    <Badge
      variant="outline"
      className="border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300"
    >
      <ArrowLeftRight data-icon="inline-start" />
      Trading
    </Badge>
  );
}

export function RawMaterialTradingBadge() {
  return (
    <Badge
      variant="outline"
      className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
    >
      <Layers data-icon="inline-start" />
      RM Trading
    </Badge>
  );
}

export function SaleTypeBadge({
  invoice,
}: {
  invoice: Pick<SalesInvoice, "isTrading" | "isRawMaterialTrading">;
}) {
  if (invoice.isRawMaterialTrading) return <RawMaterialTradingBadge />;
  if (invoice.isTrading) return <TradingBadge />;
  return null;
}
