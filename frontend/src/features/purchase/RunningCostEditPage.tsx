import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ConfirmDeletePinDialog } from "@/components/ConfirmDeletePinDialog";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiErrorMessage } from "@/lib/apiError";
import { formatInr } from "@/lib/formatInr";
import {
  parseRunningCostLineId,
  RUNNING_COST_LINE_IDS,
  RUNNING_COST_LINE_LABELS,
  type RunningCostLineId,
  type RunningCostMonth,
} from "./types";
import { useResetRunningCost, useRunningCosts, useSetRunningCost } from "./usePurchase";

const BACK_PATH = "/purchase?tab=running_cost";
const FIRST_MONTH = "2026-07";
const MAX_RANGE_MONTHS = 36;
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

type PinAction = "save" | "reset";

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function monthsBetween(from: string, to: string): string[] {
  if (!MONTH_PATTERN.test(from) || !MONTH_PATTERN.test(to) || from > to) return [];
  const keys: string[] = [];
  let [year, month] = from.split("-").map(Number);
  while (keys.length <= MAX_RANGE_MONTHS) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    if (key > to) break;
    keys.push(key);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return keys;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Current ₹ for a line in a month; null when the month has no report yet (future). */
function currentAmount(month: RunningCostMonth | undefined, lineId: RunningCostLineId) {
  if (!month) return null;
  const line = month.pnlLines.find((row) => row.id === lineId);
  return line ? { amount: line.amount, edited: line.overridden } : { amount: 0, edited: true };
}

function rangeError(from: string, to: string): string | null {
  if (!MONTH_PATTERN.test(from) || !MONTH_PATTERN.test(to)) return "Pick both months";
  if (from < FIRST_MONTH) return "Running costs start from July 2026";
  if (from > to) return "From month must be on or before To month";
  if (monthsBetween(from, to).length > MAX_RANGE_MONTHS) {
    return `Pick at most ${MAX_RANGE_MONTHS} months at a time`;
  }
  return null;
}

function pinDialogCopy(action: PinAction | null, label: string, from: string, to: string) {
  const range = from === to ? monthLabel(from) : `${monthLabel(from)} to ${monthLabel(to)}`;
  switch (action) {
    case null:
    case "save":
      return {
        title: `Save ${label}?`,
        description: `The new amount will be used for ${range} in Running cost and Profit & Loss. Enter the PIN to confirm.`,
        confirmLabel: "Save",
      };
    case "reset":
      return {
        title: `Reset ${label} to default?`,
        description: `Saved amounts for ${range} will be removed and the normal amount used again. Enter the PIN to confirm.`,
        confirmLabel: "Reset",
      };
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

export function RunningCostEditPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data, isLoading } = useRunningCosts();
  const setRunningCost = useSetRunningCost();
  const resetRunningCost = useResetRunningCost();

  const [lineId, setLineId] = useState<RunningCostLineId>(
    parseRunningCostLineId(searchParams.get("line")) ?? "rent"
  );
  const [fromMonth, setFromMonth] = useState(searchParams.get("from") ?? currentMonthKey());
  const [toMonth, setToMonth] = useState(searchParams.get("to") ?? currentMonthKey());
  const [amount, setAmount] = useState("");
  const [amountTouched, setAmountTouched] = useState(false);
  const [pinAction, setPinAction] = useState<PinAction | null>(null);

  const monthsByKey = useMemo(
    () => new Map((data?.months ?? []).map((month) => [month.key, month])),
    [data]
  );
  const months = useMemo(() => monthsBetween(fromMonth, toMonth), [fromMonth, toMonth]);
  const error = rangeError(fromMonth, toMonth);
  const parsedAmount = Number(amount);
  const amountValid = amount.trim() !== "" && Number.isFinite(parsedAmount) && parsedAmount >= 0;
  const label = RUNNING_COST_LINE_LABELS[lineId];

  useEffect(() => {
    if (amountTouched) return;
    const now = currentAmount(monthsByKey.get(fromMonth), lineId);
    setAmount(now ? String(now.amount) : "");
  }, [amountTouched, monthsByKey, fromMonth, lineId]);

  function range() {
    return { lineId, fromMonth, toMonth };
  }

  function confirmPin(pin: string) {
    const onError = (err: unknown) => toast.error(apiErrorMessage(err, "Could not save running cost"));
    switch (pinAction) {
      case null:
        return;
      case "save":
        setRunningCost.mutate(
          { ...range(), amount: parsedAmount, pin },
          {
            onSuccess: (saved) => {
              toast.success(`${label} set to ₹${formatInr(parsedAmount)} for ${saved.length} month(s)`);
              navigate(BACK_PATH);
            },
            onError,
          }
        );
        return;
      case "reset":
        resetRunningCost.mutate(
          { ...range(), pin },
          {
            onSuccess: () => {
              toast.success(`${label} reset to default`);
              navigate(BACK_PATH);
            },
            onError,
          }
        );
        return;
      default: {
        const _exhaustive: never = pinAction;
        return _exhaustive;
      }
    }
  }

  const dialogCopy = pinDialogCopy(pinAction, label, fromMonth, toMonth);
  const isPending = setRunningCost.isPending || resetRunningCost.isPending;

  return (
    <div className="grid min-w-0 gap-4">
      <PageHeader title="Edit running cost" backTo={BACK_PATH} backLabel="Back to Running cost" />

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Change an expense for a month range</CardTitle>
          <CardDescription>
            The amount is used for every month from &quot;From&quot; to &quot;To&quot; (both
            included) in Running cost and Profit &amp; Loss.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2 sm:max-w-sm">
              <Label>Expense</Label>
              <Select
                value={lineId}
                onValueChange={(value) => {
                  const next = parseRunningCostLineId(String(value));
                  if (next) setLineId(next);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string | null) => {
                      const id = parseRunningCostLineId(value);
                      return id ? RUNNING_COST_LINE_LABELS[id] : "Pick an expense";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {RUNNING_COST_LINE_IDS.map((id) => (
                    <SelectItem key={id} value={id}>
                      {RUNNING_COST_LINE_LABELS[id]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {lineId === "thekedar" ? (
                <p className="text-xs text-muted-foreground">
                  Normally ₹1.5 × pieces sold. A saved amount replaces that for the chosen months.
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rc-from">From month</Label>
              <Input
                id="rc-from"
                type="month"
                min={FIRST_MONTH}
                value={fromMonth}
                onChange={(e) => {
                  setFromMonth(e.target.value);
                  if (e.target.value > toMonth) setToMonth(e.target.value);
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rc-to">To month</Label>
              <Input
                id="rc-to"
                type="month"
                min={fromMonth || FIRST_MONTH}
                value={toMonth}
                onChange={(e) => setToMonth(e.target.value)}
              />
            </div>
            <div className="grid gap-2 sm:max-w-sm">
              <Label htmlFor="rc-amount">Amount per month (₹)</Label>
              <Input
                id="rc-amount"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => {
                  setAmountTouched(true);
                  setAmount(e.target.value);
                }}
              />
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {!error && months.length > 0 ? (
            <div className="min-w-0 overflow-x-auto rounded-md border">
              <Table className="text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Now</TableHead>
                    <TableHead className="text-right">New</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {months.map((key) => {
                    const now = currentAmount(monthsByKey.get(key), lineId);
                    return (
                      <TableRow key={key}>
                        <TableCell>{monthLabel(key)}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {isLoading && !data
                            ? "…"
                            : now
                              ? `₹${formatInr(now.amount)}${now.edited ? " (edited)" : ""}`
                              : "Upcoming"}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {amountValid ? `₹${formatInr(parsedAmount)}` : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button disabled={!!error || !amountValid || isPending} onClick={() => setPinAction("save")}>
              Save
            </Button>
            <Button
              variant="outline"
              disabled={!!error || isPending}
              onClick={() => setPinAction("reset")}
            >
              Reset to default
            </Button>
            <Button variant="ghost" disabled={isPending} onClick={() => navigate(BACK_PATH)}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmDeletePinDialog
        open={pinAction !== null}
        onOpenChange={(open) => !open && setPinAction(null)}
        title={dialogCopy.title}
        description={dialogCopy.description}
        confirmLabel={dialogCopy.confirmLabel}
        confirmVariant={pinAction === "reset" ? "destructive" : "default"}
        pinLabel="Edit PIN"
        isPending={isPending}
        onConfirm={confirmPin}
      />
    </div>
  );
}
