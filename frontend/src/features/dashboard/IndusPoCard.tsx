import { ClipboardList } from "lucide-react";
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
import { formatPipeSize, LOW_STOCK_QTY, pipeSizeMatches, SIZE_70MM_WITHOUT_CHUDI } from "@/lib/pipeSizes";
import { cn } from "@/lib/utils";
import { DashboardWash } from "./DashboardWash";
import type { IndusPoSummary } from "./useDashboardSummary";

function pieces(value: number) {
  return Math.round(value).toLocaleString("en-IN");
}

function poDateLabel(isoDate?: string | null) {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function stockForPoSize(stockBySize: { sizeMm: number; quantity: number }[], poSize: number) {
  let total = 0;
  for (const row of stockBySize) {
    if (pipeSizeMatches(row.sizeMm, poSize)) total += row.quantity;
    if (poSize === 70 && pipeSizeMatches(row.sizeMm, SIZE_70MM_WITHOUT_CHUDI)) total += row.quantity;
  }
  return total;
}

interface IndusPoCardProps {
  data?: IndusPoSummary;
  stockBySize?: { sizeMm: number; quantity: number }[];
  isLoading: boolean;
}

export function IndusPoCard({ data, stockBySize = [], isLoading }: IndusPoCardProps) {
  const navigate = useNavigate();
  const cardClass =
    "relative min-w-0 overflow-hidden border-border/40 bg-card/60 shadow-[0_4px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl";

  if (isLoading && !data) {
    return (
      <Card className={cardClass}>
        <CardHeader>
          <CardTitle className="text-base font-medium">Indus PO remaining</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Skeleton className="h-20 w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const previousPoQuantity = data.previousPoQuantity ?? 0;
  const previousSupplied = data.previousSupplied ?? 0;
  const suppliedPercent = data.poQuantity > 0 ? Math.round((data.supplied / data.poQuantity) * 100) : 0;
  const done = data.remaining <= 0;

  return (
    <Card className={cardClass}>
      <DashboardWash tint={done ? "mint" : "gold"} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/20" />
      <CardHeader>
        <CardTitle className="text-base font-medium">Indus PO remaining</CardTitle>
        <CardDescription className="text-xs">
          {data.poNo} · {poDateLabel(data.poDate)}
          {data.customerName ? ` · ${data.customerName}` : ""}
        </CardDescription>
        {data.customerId ? (
          <CardAction>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => navigate(`/sales?customer=${data.customerId}&type=factory`)}
            >
              Sales
            </Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-4">
        <div
          className={cn(
            "relative min-w-0 overflow-hidden rounded-xl px-3 py-4 text-center",
            done
              ? "bg-gradient-to-br from-emerald-200/55 via-green-100/35 to-teal-50/40 dark:from-emerald-500/20 dark:via-emerald-900/15 dark:to-transparent"
              : "bg-gradient-to-br from-amber-200/55 via-yellow-100/35 to-orange-50/40 dark:from-amber-500/20 dark:via-amber-900/15 dark:to-transparent"
          )}
        >
          <p
            className={cn(
              "text-[10px] font-medium uppercase tracking-wider sm:text-[11px]",
              done ? "text-green-600 dark:text-green-400" : "text-amber-700 dark:text-amber-400"
            )}
          >
            {done ? "PO complete" : "Pieces left"}
          </p>
          <p
            className={cn(
              "mt-1 text-3xl font-bold tabular-nums sm:text-4xl",
              done ? "text-green-600 dark:text-green-400" : "text-amber-800 dark:text-amber-300"
            )}
          >
            {pieces(data.remaining)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            of {pieces(data.target)} (this PO {pieces(data.poQuantity)} + last PO left {pieces(data.lastMonthLeft)})
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-end justify-between text-sm">
            <span className="text-muted-foreground">{suppliedPercent}% of this PO supplied</span>
            <span className="text-xs text-muted-foreground">
              {data.invoiceCount} invoice{data.invoiceCount === 1 ? "" : "s"} after {poDateLabel(data.previousPoTo)}
            </span>
          </div>
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700 ease-out",
                done ? "bg-green-500" : suppliedPercent >= 50 ? "bg-primary" : "bg-amber-500"
              )}
              style={{ width: `${Math.min(suppliedPercent, 100)}%` }}
            />
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="relative min-w-0 overflow-hidden rounded-xl bg-gradient-to-br from-sky-200/40 via-muted/50 to-indigo-100/30 px-2 py-3 text-center dark:from-sky-500/15 dark:via-muted/40 dark:to-transparent sm:px-3">
            <p className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-[11px]">
              Last PO
            </p>
            <p className="mt-1 truncate text-sm font-bold tabular-nums sm:text-xl">{pieces(previousPoQuantity)}</p>
            <p className="truncate text-[10px] text-muted-foreground sm:text-xs">
              {poDateLabel(data.previousPoFrom)} – {poDateLabel(data.previousPoTo)}
            </p>
          </div>
          <div className="relative min-w-0 overflow-hidden rounded-xl bg-gradient-to-br from-violet-200/40 via-muted/50 to-fuchsia-100/25 px-2 py-3 text-center dark:from-violet-500/15 dark:via-muted/40 dark:to-transparent sm:px-3">
            <p className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-[11px]">
              Given
            </p>
            <p className="mt-1 truncate text-sm font-bold tabular-nums sm:text-xl">{pieces(previousSupplied)}</p>
            <p className="truncate text-[10px] text-muted-foreground sm:text-xs">of last PO</p>
          </div>
          <div className="relative min-w-0 overflow-hidden rounded-xl bg-gradient-to-br from-amber-200/55 via-yellow-100/35 to-orange-50/30 px-2 py-3 text-center dark:from-amber-500/20 dark:via-amber-900/15 dark:to-transparent sm:px-3">
            <p className="truncate text-[10px] font-medium uppercase tracking-wider text-amber-700 dark:text-amber-400 sm:text-[11px]">
              Last PO left
            </p>
            <p className="mt-1 truncate text-sm font-bold tabular-nums text-amber-800 dark:text-amber-300 sm:text-xl">
              {pieces(data.lastMonthLeft)}
            </p>
          </div>
          <div className="relative min-w-0 overflow-hidden rounded-xl bg-gradient-to-br from-emerald-200/55 via-green-100/35 to-teal-50/30 px-2 py-3 text-center dark:from-emerald-500/20 dark:via-emerald-900/15 dark:to-transparent sm:px-3">
            <p className="truncate text-[10px] font-medium uppercase tracking-wider text-green-600 dark:text-green-400 sm:text-[11px]">
              This PO supplied
            </p>
            <p className="mt-1 truncate text-sm font-bold tabular-nums text-green-600 dark:text-green-400 sm:text-xl">
              {pieces(data.supplied)}
            </p>
            <p className="truncate text-[10px] text-muted-foreground sm:text-xs">of {pieces(data.poQuantity)}</p>
          </div>
        </div>

        <div className="min-w-0 rounded-md border">
          <Table className="text-xs sm:text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>Size</TableHead>
                <TableHead className="text-right">PO qty</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Supplied</TableHead>
                <TableHead className="text-right">Left on line</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.lines.map((line) => {
                const left = Math.max(0, line.ordered - line.supplied);
                const over = line.supplied > line.ordered;
                const stock = stockForPoSize(stockBySize, line.sizeMm);
                return (
                  <TableRow key={line.sizeMm}>
                    <TableCell className="font-medium">{formatPipeSize(line.sizeMm)}</TableCell>
                    <TableCell className="text-right tabular-nums">{pieces(line.ordered)}</TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums",
                        stock < LOW_STOCK_QTY || (left > 0 && stock < left)
                          ? "font-semibold text-red-600 dark:text-red-400"
                          : undefined
                      )}
                    >
                      {pieces(stock)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{pieces(line.supplied)}</TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-semibold tabular-nums",
                        over ? "text-amber-600 dark:text-amber-400" : undefined
                      )}
                    >
                      {over ? `${pieces(line.supplied - line.ordered)} extra` : pieces(left)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {data.otherSupplied > 0 ? (
          <p className="text-xs text-muted-foreground">
            {pieces(data.otherSupplied)} pieces billed in other sizes also count toward remaining.
          </p>
        ) : null}

        {data.customerId ? (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate(`/sales?customer=${data.customerId}&type=factory`)}
          >
            <ClipboardList className="size-4" />
            Indus factory bills
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
