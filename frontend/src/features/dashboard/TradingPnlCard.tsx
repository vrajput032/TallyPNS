import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatInr } from "@/lib/formatInr";
import { cn } from "@/lib/utils";
import { DashboardWash } from "./DashboardWash";
import type { RawMaterialTradingPnlSummary, TradingPnlSummary } from "./useDashboardSummary";

function profitTone(value: number) {
  if (value > 0) return "text-green-600 dark:text-green-400";
  if (value < 0) return "text-red-600 dark:text-red-400";
  return undefined;
}

function signedInr(value: number, withSymbol = true) {
  const sign = value < 0 ? "−" : "";
  return `${sign}${withSymbol ? "₹" : ""}${formatInr(Math.abs(value), 0)}`;
}

type TradingPnlCardProps =
  | { variant: "goods"; data?: TradingPnlSummary; isLoading: boolean }
  | { variant: "raw-material"; data?: RawMaterialTradingPnlSummary; isLoading: boolean };

type CardCopy = {
  title: string;
  description: string;
  soldNote: string;
  boughtNote: string;
  emptyHint: string;
  warning: string | null;
  links: { label: string; to: string }[];
};

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function cardCopy(props: TradingPnlCardProps): CardCopy {
  switch (props.variant) {
    case "goods": {
      const data = props.data;
      return {
        title: "Trading Profit & Loss",
        description: "Goods bought and resold · sold − bought − GST = profit",
        soldNote: plural(data?.invoiceCount ?? 0, "invoice"),
        boughtNote: plural(data?.billCount ?? 0, "bill"),
        emptyHint: "Mark sales invoices as Trading and add Trading purchase bills to see profit here.",
        warning:
          data && data.invoiceCount > 0 && data.billCount === 0
            ? "No Trading purchase bills yet, so all trading sales show as profit."
            : null,
        links: [
          { label: "Sales", to: "/sales" },
          { label: "Purchase", to: "/purchase" },
        ],
      };
    }
    case "raw-material": {
      const data = props.data;
      return {
        title: "Raw Material Trading",
        description: "Steel tube resold by kg · sold − bought − GST = profit",
        soldNote: `${formatInr(data?.kg ?? 0, 0)} kg · ${plural(data?.invoiceCount ?? 0, "invoice")}`,
        boughtNote: "At the ₹/kg on each invoice",
        emptyHint: "Pick Raw material trading as the sale type on a sales invoice to see profit here.",
        warning: null,
        links: [
          { label: "Sales", to: "/sales?type=raw-material" },
          { label: "Raw material", to: "/raw-material" },
        ],
      };
    }
    default: {
      const _exhaustive: never = props;
      return _exhaustive;
    }
  }
}

export function TradingPnlCard(props: TradingPnlCardProps) {
  const { data, isLoading } = props;
  const navigate = useNavigate();
  const copy = cardCopy(props);

  const cardClass =
    "relative min-w-0 overflow-hidden border-border/40 bg-card/60 shadow-[0_4px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl";

  if (isLoading && !data) {
    return (
      <Card className={cardClass}>
        <CardHeader>
          <CardTitle className="text-base font-medium">{copy.title}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Skeleton className="h-20 w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const hasActivity = data.invoiceCount > 0 || data.purchases !== 0;
  const activeMonths = data.months.filter((row) => row.sales !== 0 || row.purchases !== 0);

  return (
    <Card className={cardClass}>
      <DashboardWash tint={data.profit < 0 ? "rose" : "mint"} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/20" />
      <CardHeader>
        <CardTitle className="text-base font-medium">{copy.title}</CardTitle>
        <CardDescription className="text-xs">{copy.description}</CardDescription>
        <CardAction className="flex gap-1">
          {copy.links.map((link) => (
            <Button
              key={link.to}
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => navigate(link.to)}
            >
              {link.label}
            </Button>
          ))}
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="relative min-w-0 overflow-hidden rounded-xl bg-gradient-to-br from-sky-200/40 via-muted/50 to-indigo-100/25 px-2 py-3 text-center dark:from-sky-500/15 dark:via-muted/40 dark:to-transparent sm:px-3">
            <p className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-[11px]">
              Sold
            </p>
            <p className="mt-1 truncate text-sm font-bold tabular-nums sm:text-xl">
              ₹{formatInr(data.sales, 0)}
            </p>
            <p className="truncate text-[10px] text-muted-foreground sm:text-xs">{copy.soldNote}</p>
          </div>
          <div className="relative min-w-0 overflow-hidden rounded-xl bg-gradient-to-br from-orange-200/40 via-muted/50 to-amber-100/25 px-2 py-3 text-center dark:from-orange-500/15 dark:via-muted/40 dark:to-transparent sm:px-3">
            <p className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-[11px]">
              Bought
            </p>
            <p className="mt-1 truncate text-sm font-bold tabular-nums sm:text-xl">
              ₹{formatInr(data.purchases, 0)}
            </p>
            <p className="truncate text-[10px] text-muted-foreground sm:text-xs">{copy.boughtNote}</p>
          </div>
          <div className="relative min-w-0 overflow-hidden rounded-xl bg-gradient-to-br from-violet-200/40 via-muted/50 to-fuchsia-100/25 px-2 py-3 text-center dark:from-violet-500/15 dark:via-muted/40 dark:to-transparent sm:px-3">
            <p className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-[11px]">
              {data.gst < 0 ? "GST credit" : "GST payable"}
            </p>
            <p className="mt-1 truncate text-sm font-bold tabular-nums sm:text-xl">
              ₹{formatInr(Math.abs(data.gst), 0)}
            </p>
            <p className="truncate text-[10px] text-muted-foreground sm:text-xs">
              {data.gst < 0 ? "Added back" : "Owed to govt"}
            </p>
          </div>
          <div
            className={cn(
              "relative min-w-0 overflow-hidden rounded-xl px-2 py-3 text-center sm:px-3",
              data.profit < 0
                ? "bg-gradient-to-br from-rose-200/55 via-pink-100/35 to-red-50/30 dark:from-rose-500/20 dark:via-rose-900/15 dark:to-transparent"
                : "bg-gradient-to-br from-emerald-200/55 via-green-100/35 to-teal-50/30 dark:from-emerald-500/20 dark:via-emerald-900/15 dark:to-transparent"
            )}
          >
            <p
              className={cn(
                "truncate text-[10px] font-medium uppercase tracking-wider sm:text-[11px]",
                profitTone(data.profit) ?? "text-muted-foreground"
              )}
            >
              {data.profit < 0 ? "Loss" : "Profit"}
            </p>
            <p className={cn("mt-1 truncate text-sm font-bold tabular-nums sm:text-xl", profitTone(data.profit))}>
              {signedInr(data.profit)}
            </p>
            <p className="truncate text-[10px] text-muted-foreground sm:text-xs">After GST</p>
          </div>
        </div>

        {!hasActivity ? (
          <p className="text-sm text-muted-foreground">{copy.emptyHint}</p>
        ) : copy.warning ? (
          <p className="text-xs text-amber-600 dark:text-amber-400">{copy.warning}</p>
        ) : null}

        {activeMonths.length > 0 ? (
          <div className="min-w-0 rounded-md border">
            <Table className="text-xs sm:text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Sold</TableHead>
                  <TableHead className="text-right">Bought</TableHead>
                  <TableHead className="text-right">GST</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeMonths.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatInr(row.sales, 0)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatInr(row.purchases, 0)}</TableCell>
                    <TableCell className="text-right tabular-nums">{signedInr(row.gst, false)}</TableCell>
                    <TableCell className={cn("text-right font-semibold tabular-nums", profitTone(row.profit))}>
                      {signedInr(row.profit)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
