import { useState } from "react";
import { ClipboardList, FileText, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
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
import { api } from "@/lib/api";
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

function percent(part: number, whole: number) {
  return whole > 0 ? Math.min(100, Math.round((part / whole) * 100)) : 0;
}

/** The PDF needs the login token, so fetch it as a blob instead of linking to the API. */
async function openPoPdf(poNo: string) {
  // Opened before the await so popup blockers treat it as part of the click.
  const tab = window.open("", "_blank");
  try {
    const { data } = await api.get<Blob>(`/dashboard/indus-po/${encodeURIComponent(poNo)}/pdf`, {
      responseType: "blob",
    });
    const url = URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
    if (tab) {
      tab.location.href = url;
    } else {
      const link = document.createElement("a");
      link.href = url;
      link.download = `${poNo}.pdf`;
      link.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  } catch {
    tab?.close();
    toast.error(`Could not open ${poNo} PDF`);
  }
}

interface IndusPoCardProps {
  data?: IndusPoSummary;
  stockBySize?: { sizeMm: number; quantity: number }[];
  isLoading: boolean;
}

export function IndusPoCard({ data, stockBySize = [], isLoading }: IndusPoCardProps) {
  const navigate = useNavigate();
  const [openingPo, setOpeningPo] = useState<string | null>(null);
  const cardClass =
    "relative min-w-0 overflow-hidden border-border/40 bg-card/60 shadow-[0_4px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl";

  // A summary cached before the previous-PO-first change has no previousLeft yet.
  if (!data || data.previousLeft == null) {
    if (!isLoading) return null;
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

  const done = data.remaining <= 0;
  const onPrevious = !data.previousComplete;
  const progressPercent = onPrevious
    ? percent(data.previousSupplied, data.previousPoQuantity)
    : percent(data.supplied, data.poQuantity);
  const progressLabel = onPrevious
    ? `${progressPercent}% of ${data.previousPoNo} supplied`
    : `${progressPercent}% of ${data.poNo} supplied`;

  return (
    <Card className={cardClass}>
      <DashboardWash tint={done ? "mint" : "gold"} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/20" />
      <CardHeader>
        <CardTitle className="text-base font-medium">Indus PO remaining</CardTitle>
        <CardDescription className="text-xs">
          {data.previousPoNo} then {data.poNo}
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
            {done ? "Both POs complete" : "Pieces left"}
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
            {onPrevious
              ? `Finish ${data.previousPoNo} first: ${pieces(data.previousLeft)} left · then ${data.poNo}: ${pieces(data.currentLeft)}`
              : `${data.previousPoNo} complete · ${data.poNo}: ${pieces(data.currentLeft)} left of ${pieces(data.poQuantity)}`}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-end justify-between gap-2 text-sm">
            <span className="text-muted-foreground">{progressLabel}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {data.invoiceCount} invoice{data.invoiceCount === 1 ? "" : "s"} since {poDateLabel(data.previousPoDate)}
            </span>
          </div>
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700 ease-out",
                done ? "bg-green-500" : progressPercent >= 50 ? "bg-primary" : "bg-amber-500"
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="relative min-w-0 overflow-hidden rounded-xl bg-gradient-to-br from-sky-200/40 via-muted/50 to-indigo-100/30 px-2 py-3 text-center dark:from-sky-500/15 dark:via-muted/40 dark:to-transparent sm:px-3">
            <p className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-[11px]">
              Last PO
            </p>
            <p className="mt-1 truncate text-sm font-bold tabular-nums sm:text-xl">{pieces(data.previousPoQuantity)}</p>
            <p className="truncate text-[10px] text-muted-foreground sm:text-xs">
              {data.previousPoNo} · {poDateLabel(data.previousPoDate)}
            </p>
          </div>
          <div className="relative min-w-0 overflow-hidden rounded-xl bg-gradient-to-br from-violet-200/40 via-muted/50 to-fuchsia-100/25 px-2 py-3 text-center dark:from-violet-500/15 dark:via-muted/40 dark:to-transparent sm:px-3">
            <p className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-[11px]">
              Given
            </p>
            <p className="mt-1 truncate text-sm font-bold tabular-nums sm:text-xl">{pieces(data.previousSupplied)}</p>
            <p className="truncate text-[10px] text-muted-foreground sm:text-xs">of last PO</p>
          </div>
          <div
            className={cn(
              "relative min-w-0 overflow-hidden rounded-xl px-2 py-3 text-center sm:px-3",
              onPrevious
                ? "bg-gradient-to-br from-amber-200/55 via-yellow-100/35 to-orange-50/30 dark:from-amber-500/20 dark:via-amber-900/15 dark:to-transparent"
                : "bg-gradient-to-br from-emerald-200/55 via-green-100/35 to-teal-50/30 dark:from-emerald-500/20 dark:via-emerald-900/15 dark:to-transparent"
            )}
          >
            <p
              className={cn(
                "truncate text-[10px] font-medium uppercase tracking-wider sm:text-[11px]",
                onPrevious ? "text-amber-700 dark:text-amber-400" : "text-green-600 dark:text-green-400"
              )}
            >
              Last PO left
            </p>
            <p
              className={cn(
                "mt-1 truncate text-sm font-bold tabular-nums sm:text-xl",
                onPrevious ? "text-amber-800 dark:text-amber-300" : "text-green-600 dark:text-green-400"
              )}
            >
              {onPrevious ? pieces(data.previousLeft) : "Complete"}
            </p>
          </div>
          <div className="relative min-w-0 overflow-hidden rounded-xl bg-gradient-to-br from-emerald-200/55 via-green-100/35 to-teal-50/30 px-2 py-3 text-center dark:from-emerald-500/20 dark:via-emerald-900/15 dark:to-transparent sm:px-3">
            <p className="truncate text-[10px] font-medium uppercase tracking-wider text-green-600 dark:text-green-400 sm:text-[11px]">
              This PO supplied
            </p>
            <p className="mt-1 truncate text-sm font-bold tabular-nums text-green-600 dark:text-green-400 sm:text-xl">
              {pieces(data.supplied)}
            </p>
            <p className="truncate text-[10px] text-muted-foreground sm:text-xs">
              of {pieces(data.poQuantity)} · {data.poNo}
            </p>
          </div>
        </div>

        <div className="min-w-0 rounded-md border">
          <Table className="text-[11px] sm:text-sm [&_td]:px-1.5 [&_th]:px-1.5 sm:[&_td]:px-2 sm:[&_th]:px-2">
            <TableHeader>
              <TableRow>
                <TableHead>Size</TableHead>
                <TableHead className="text-right">Last PO</TableHead>
                <TableHead className="text-right">This PO</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Left</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.lines.map((line) => {
                const previousLeft = Math.max(0, line.previousOrdered - line.previousSupplied);
                const currentLeft = Math.max(0, line.ordered - line.supplied);
                const totalLeft = previousLeft + currentLeft;
                const extra = line.supplied - line.ordered;
                const stock = stockForPoSize(stockBySize, line.sizeMm);
                return (
                  <TableRow key={line.sizeMm}>
                    <TableCell className="font-medium">{formatPipeSize(line.sizeMm)}</TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums",
                        previousLeft > 0 ? "font-semibold text-amber-700 dark:text-amber-400" : "text-muted-foreground"
                      )}
                    >
                      {line.previousOrdered > 0 ? (previousLeft > 0 ? pieces(previousLeft) : "Done") : "–"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {pieces(line.supplied)} / {pieces(line.ordered)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums",
                        stock < LOW_STOCK_QTY || (totalLeft > 0 && stock < totalLeft)
                          ? "font-semibold text-red-600 dark:text-red-400"
                          : undefined
                      )}
                    >
                      {pieces(stock)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-semibold tabular-nums",
                        extra > 0 ? "text-amber-600 dark:text-amber-400" : undefined
                      )}
                    >
                      {extra > 0 ? `${pieces(extra)} extra` : pieces(totalLeft)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {data.otherSupplied > 0 ? (
          <p className="text-xs text-muted-foreground">
            {pieces(data.otherSupplied)} pieces billed in other sizes are not on either PO.
          </p>
        ) : null}

        <div className="grid min-w-0 grid-cols-2 gap-2">
          {[
            { poNo: data.previousPoNo, date: data.previousPoDate },
            { poNo: data.poNo, date: data.poDate },
          ].map((po) => (
            <Button
              key={po.poNo}
              variant="outline"
              className="h-auto min-w-0 flex-col gap-0.5 py-2"
              disabled={openingPo === po.poNo}
              onClick={() => {
                setOpeningPo(po.poNo);
                void openPoPdf(po.poNo).finally(() => setOpeningPo(null));
              }}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                {openingPo === po.poNo ? (
                  <Loader2 className="size-4 shrink-0 animate-spin" />
                ) : (
                  <FileText className="size-4 shrink-0" />
                )}
                <span className="truncate">{po.poNo}</span>
              </span>
              <span className="truncate text-[11px] font-normal text-muted-foreground">
                PO PDF · {poDateLabel(po.date)}
              </span>
            </Button>
          ))}
        </div>

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
