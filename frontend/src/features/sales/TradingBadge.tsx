import { ArrowLeftRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
