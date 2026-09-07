import { Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TableSkeletonRows } from "@/components/loading/PageSkeletons";
import { formatInr } from "@/lib/formatInr";
import { formatPipeSize } from "@/lib/pipeSizes";
import { cn } from "@/lib/utils";
import { useMonthProfitLoss, usePnlSummary } from "./useProfitLoss";
import {
  expenseKindLabel,
  isScrapGrade,
  readStoredScrapGrade,
  scrapGradeLabel,
  writeStoredScrapGrade,
  type ExpenseEntry,
  type MonthPnl,
  type PartnerExpenseRow,
  type PnlLine,
  type ScrapGrade,
} from "./types";

type ViewMode = "month" | "all";

function monthInputValue(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function parseMonthInput(value: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

function parseView(value: string | null): ViewMode {
  return value === "all" ? "all" : "month";
}

function parseGradeParam(value: string | null, year: number, month: number): ScrapGrade {
  if (value && isScrapGrade(value)) return value;
  return readStoredScrapGrade(year, month);
}

function formatQty(value: number) {
  return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function netClass(net: number) {
  if (net > 0.009) return "text-emerald-700 dark:text-emerald-400";
  if (net < -0.009) return "text-red-700 dark:text-red-400";
  return "text-foreground";
}

function LinesTable({
  title,
  lines,
  total,
  isLoading,
}: {
  title: string;
  lines: PnlLine[] | undefined;
  total: number;
  isLoading: boolean;
}) {
  return (
    <div className="min-w-0 rounded-md border bg-card">
      <div className="border-b px-4 py-2 font-medium">{title}</div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Particulars</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeletonRows columns={2} rows={6} />
          ) : (
            (lines ?? []).map((line) => (
              <TableRow key={line.id}>
                <TableCell>{line.label}</TableCell>
                <TableCell className="text-right">{formatInr(line.amount)}</TableCell>
              </TableRow>
            ))
          )}
          <TableRow className="font-semibold">
            <TableCell>Total</TableCell>
            <TableCell className="text-right">{formatInr(total)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

function SummaryCards({
  totalIncome,
  totalCosts,
  net,
  isLoading,
}: {
  totalIncome: number;
  totalCosts: number;
  net: number;
  isLoading: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Income</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="text-2xl font-semibold">{formatInr(totalIncome)}</div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Costs</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className="text-2xl font-semibold">{formatInr(totalCosts)}</div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Net</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div className={cn("text-2xl font-semibold", netClass(net))}>{formatInr(net)}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function expenseKindBadgeVariant(
  kind: ExpenseEntry["kind"]
): "default" | "secondary" | "outline" {
  switch (kind) {
    case "delivery":
      return "default";
    case "other":
      return "secondary";
    case "electricity":
      return "secondary";
    case "skipped":
      return "outline";
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function ExpenseEntriesTable({
  entries,
  isLoading,
}: {
  entries: ExpenseEntry[] | undefined;
  isLoading: boolean;
}) {
  const rows = entries ?? [];
  return (
    <div className="min-w-0 rounded-md border bg-card">
      <div className="border-b px-4 py-2 font-medium">Marked expense entries</div>
      <p className="px-4 pt-2 text-xs text-muted-foreground">
        Live from pns-expenses. Split partner rows with the same note are counted once. Kiraya is
        delivery. Transfers, raw material, and CNC payments are listed but not added. Totals and
        items already in rent / Akshay salary are listed but not added again.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Particulars</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeletonRows columns={3} rows={8} />
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                No partner expense notes for this month.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => (
              <TableRow key={row.id} className={row.kind === "skipped" ? "text-muted-foreground" : undefined}>
                <TableCell>
                  <div>{row.label}</div>
                  {row.skipReason ? (
                    <div className="text-xs text-muted-foreground">{row.skipReason}</div>
                  ) : null}
                </TableCell>
                <TableCell>
                  <Badge variant={expenseKindBadgeVariant(row.kind)}>{expenseKindLabel(row.kind)}</Badge>
                </TableCell>
                <TableCell className="text-right">{formatInr(row.amount)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function formatExpenseDate(value: string) {
  const day = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return value;
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { timeZone: "UTC" });
}

function PartnerExpensesTable({
  rows,
  fetchedAt,
  isLoading,
}: {
  rows: PartnerExpenseRow[] | undefined;
  fetchedAt: string | null | undefined;
  isLoading: boolean;
}) {
  const list = rows ?? [];
  return (
    <div className="min-w-0 rounded-md border bg-card">
      <div className="border-b px-4 py-2 font-medium">pns-expenses</div>
      <p className="px-4 pt-2 text-xs text-muted-foreground">
        {isLoading
          ? "Pulling the latest pns-expenses…"
          : fetchedAt
            ? `Last pulled ${new Date(fetchedAt).toLocaleString("en-GB")}. Open Profit & Loss or tap Refresh to pull again.`
            : "Could not reach pns-expenses. Showing last saved figures if any."}
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Paid by</TableHead>
            <TableHead>Particulars</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableSkeletonRows columns={4} rows={6} />
          ) : list.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                No pns-expenses rows for this month.
              </TableCell>
            </TableRow>
          ) : (
            list.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="whitespace-nowrap">{formatExpenseDate(row.date)}</TableCell>
                <TableCell>{row.paidBy ?? "—"}</TableCell>
                <TableCell>
                  <div className="max-w-[28rem] whitespace-pre-wrap break-words">{row.description}</div>
                  {row.billUrl ? (
                    <a
                      href={row.billUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary underline-offset-2 hover:underline"
                    >
                      Bill
                    </a>
                  ) : null}
                </TableCell>
                <TableCell className="text-right">{formatInr(row.amount)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function MonthDetail({ data, isLoading }: { data: MonthPnl | undefined; isLoading: boolean }) {
  return (
    <div className="grid gap-4">
      <SummaryCards
        totalIncome={data?.totalIncome ?? 0}
        totalCosts={data?.totalCosts ?? 0}
        net={data?.net ?? 0}
        isLoading={isLoading}
      />
      <p className="text-sm text-muted-foreground">
        {data
          ? `${data.monthLabel} · scrap ${scrapGradeLabel(data.scrapGrade)} · 12% of ${formatQty(data.rmKg)} kg RM = ${formatQty(data.scrapKg)} kg scrap · ${formatQty(data.piecesSold)} pcs sold × ₹1.50 thekedar`
          : "Factory costing for the selected month."}
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <LinesTable title="Income" lines={data?.income} total={data?.totalIncome ?? 0} isLoading={isLoading} />
        <LinesTable title="Costs" lines={data?.costs} total={data?.totalCosts ?? 0} isLoading={isLoading} />
      </div>
      <PartnerExpensesTable
        rows={data?.partnerExpenses}
        fetchedAt={data?.expensesFetchedAt}
        isLoading={isLoading}
      />
      <ExpenseEntriesTable entries={data?.expenseEntries} isLoading={isLoading} />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="min-w-0 rounded-md border bg-card">
          <div className="border-b px-4 py-2 font-medium">Pieces sold</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Size</TableHead>
                <TableHead className="text-right">Qty</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeletonRows columns={2} rows={5} />
              ) : (
                (data?.piecesSoldBySize ?? []).map((row) => (
                  <TableRow key={row.sizeMm}>
                    <TableCell>{formatPipeSize(row.sizeMm)}</TableCell>
                    <TableCell className="text-right">{formatQty(row.quantity)}</TableCell>
                  </TableRow>
                ))
              )}
              {data && data.unsizedPieces > 0 && (
                <TableRow>
                  <TableCell>No size</TableCell>
                  <TableCell className="text-right">{formatQty(data.unsizedPieces)}</TableCell>
                </TableRow>
              )}
              <TableRow className="font-semibold">
                <TableCell>Total</TableCell>
                <TableCell className="text-right">{formatQty(data?.piecesSold ?? 0)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <div className="min-w-0 rounded-md border bg-card">
          <div className="border-b px-4 py-2 font-medium">Yield from this month&apos;s RM (hint)</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Size</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead className="text-right">Pcs / kg</TableHead>
                <TableHead className="text-right">Could make</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeletonRows columns={4} rows={3} />
              ) : (
                (data?.yieldHint ?? []).map((row) => (
                  <TableRow key={row.sizeMm}>
                    <TableCell>{formatPipeSize(row.sizeMm)}</TableCell>
                    <TableCell>{row.grams} g</TableCell>
                    <TableCell className="text-right">{row.piecesPerKg}</TableCell>
                    <TableCell className="text-right">{formatQty(row.pieces)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

export function ProfitLossPage() {
  const now = new Date();
  const [searchParams, setSearchParams] = useSearchParams();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const view = parseView(searchParams.get("view"));
  const scrapGrade = parseGradeParam(searchParams.get("scrapGrade"), year, month);

  const monthQuery = useMonthProfitLoss(month, year, scrapGrade);
  const summaryQuery = usePnlSummary(scrapGrade, view === "all");

  function updateParams(next: { view?: ViewMode; scrapGrade?: ScrapGrade }) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        const nextView = next.view ?? parseView(params.get("view"));
        if (nextView === "all") params.set("view", "all");
        else params.delete("view");
        const nextGrade = next.scrapGrade ?? scrapGrade;
        if (nextGrade === "iron87") params.delete("scrapGrade");
        else params.set("scrapGrade", nextGrade);
        return params;
      },
      { replace: true }
    );
  }

  function setView(next: string) {
    updateParams({ view: next === "all" ? "all" : "month" });
  }

  function setScrapGrade(grade: ScrapGrade) {
    writeStoredScrapGrade(year, month, grade);
    updateParams({ scrapGrade: grade });
  }

  function shiftMonth(delta: number) {
    const date = new Date(year, month - 1 + delta, 1);
    const nextYear = date.getFullYear();
    const nextMonth = date.getMonth() + 1;
    setYear(nextYear);
    setMonth(nextMonth);
    const stored = readStoredScrapGrade(nextYear, nextMonth);
    updateParams({ scrapGrade: stored });
  }

  const isRefreshing =
    monthQuery.isFetching || (view === "all" && summaryQuery.isFetching);

  function refreshExpenses() {
    monthQuery.refetch();
    summaryQuery.refetch();
  }

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Profit & Loss"
        backTo="/"
        backLabel="Back to Dashboard"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {view === "month" ? (
              <>
                <Button type="button" variant="outline" size="sm" onClick={() => shiftMonth(-1)}>
                  Prev
                </Button>
                <Input
                  type="month"
                  className="w-[10.5rem]"
                  value={monthInputValue(year, month)}
                  onChange={(e) => {
                    const parsed = parseMonthInput(e.target.value);
                    if (parsed) {
                      setYear(parsed.year);
                      setMonth(parsed.month);
                      updateParams({ scrapGrade: readStoredScrapGrade(parsed.year, parsed.month) });
                    }
                  }}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => shiftMonth(1)}>
                  Next
                </Button>
              </>
            ) : null}
            <div className="flex rounded-lg border p-0.5">
              <Button
                type="button"
                size="sm"
                variant={scrapGrade === "iron87" ? "default" : "ghost"}
                onClick={() => setScrapGrade("iron87")}
              >
                87 iron
              </Button>
              <Button
                type="button"
                size="sm"
                variant={scrapGrade === "iron95" ? "default" : "ghost"}
                onClick={() => setScrapGrade("iron95")}
              >
                95+ iron
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={refreshExpenses}
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Refresh
            </Button>
          </div>
        }
      />

      <Tabs value={view} onValueChange={setView}>
        <TabsList>
          <TabsTrigger value="month">Month</TabsTrigger>
          <TabsTrigger value="all">All time</TabsTrigger>
        </TabsList>
        <TabsContent value="month">
          <MonthDetail data={monthQuery.data} isLoading={monthQuery.isLoading} />
        </TabsContent>
        <TabsContent value="all">
          <div className="grid gap-4">
            <SummaryCards
              totalIncome={summaryQuery.data?.totalIncome ?? 0}
              totalCosts={summaryQuery.data?.totalCosts ?? 0}
              net={summaryQuery.data?.net ?? 0}
              isLoading={summaryQuery.isLoading}
            />
            <p className="text-sm text-muted-foreground">
              From July 2026. Scrap is 12% of each month&apos;s RM kg at {scrapGradeLabel(scrapGrade)}.
            </p>
            <div className="min-w-0 rounded-md border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Income</TableHead>
                    <TableHead className="text-right">Costs</TableHead>
                    <TableHead className="text-right">Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaryQuery.isLoading ? (
                    <TableSkeletonRows columns={4} rows={8} />
                  ) : (summaryQuery.data?.months.length ?? 0) === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No months yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    summaryQuery.data?.months.map((row) => (
                      <TableRow key={`${row.year}-${row.month}`}>
                        <TableCell>{row.monthLabel}</TableCell>
                        <TableCell className="text-right">{formatInr(row.totalIncome)}</TableCell>
                        <TableCell className="text-right">{formatInr(row.totalCosts)}</TableCell>
                        <TableCell className={cn("text-right font-medium", netClass(row.net))}>
                          {formatInr(row.net)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  <TableRow className="font-semibold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">
                      {formatInr(summaryQuery.data?.totalIncome ?? 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatInr(summaryQuery.data?.totalCosts ?? 0)}
                    </TableCell>
                    <TableCell className={cn("text-right", netClass(summaryQuery.data?.net ?? 0))}>
                      {formatInr(summaryQuery.data?.net ?? 0)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
