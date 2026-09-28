import { ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ConfirmDeletePinDialog } from "@/components/ConfirmDeletePinDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiErrorMessage } from "@/lib/apiError";
import { formatInr } from "@/lib/formatInr";
import { canDelete } from "@/lib/permissions";
import { useAuthStore } from "@/store/authStore";
import {
  parseRunningCostLineId,
  runningCostEditPath,
  type RunningCostLine,
  type RunningCostMonth,
} from "./types";
import { useDeletePurchaseBill, useRunningCosts, useSetRunningCost } from "./usePurchase";

type RunningCostEntry = RunningCostMonth["entries"][number];

type DeleteTarget =
  | { kind: "line"; month: RunningCostMonth; line: RunningCostLine }
  | { kind: "entry"; entry: RunningCostEntry };

function deleteDialogCopy(target: DeleteTarget | null): { title: string; description: string } {
  if (!target) return { title: "Delete?", description: "" };
  switch (target.kind) {
    case "line":
      return {
        title: `Remove ${target.line.label} from ${target.month.label}?`,
        description:
          "It will count as ₹0 in Running cost and Profit & Loss for this month. Use Edit running costs → Reset to default to bring it back. Enter the deletion PIN to confirm.",
      };
    case "entry":
      return {
        title: `Move ${target.entry.title?.trim() || target.entry.billNo} to recycle bin?`,
        description:
          "The running-cost bill will be removed from Purchase and can be restored from Recycle Bin. Enter the deletion PIN to confirm.",
      };
    default: {
      const _exhaustive: never = target;
      return _exhaustive;
    }
  }
}

function RowActions({
  onEdit,
  onDelete,
  label,
}: {
  onEdit: () => void;
  onDelete?: () => void;
  label: string;
}) {
  return (
    <span className="flex shrink-0 items-center">
      <Button variant="ghost" size="icon-sm" aria-label={`Edit ${label}`} onClick={onEdit}>
        <Pencil className="size-3.5" />
      </Button>
      {onDelete ? (
        <Button variant="ghost" size="icon-sm" aria-label={`Delete ${label}`} onClick={onDelete}>
          <Trash2 className="size-3.5" />
        </Button>
      ) : null}
    </span>
  );
}

function CostRow({ children, amount, actions }: { children: ReactNode; amount: number; actions: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="min-w-0 flex-1 truncate">{children}</span>
      <span className="shrink-0 tabular-nums">₹{formatInr(amount)}</span>
      {actions}
    </div>
  );
}

function MonthCard({
  month,
  defaultOpen,
  allowDelete,
  onDelete,
}: {
  month: RunningCostMonth;
  defaultOpen: boolean;
  allowDelete: boolean;
  onDelete: (target: DeleteTarget) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const navigate = useNavigate();
  const Icon = open ? ChevronDown : ChevronRight;

  return (
    <Card className="min-w-0 overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flex items-center gap-2 font-semibold">
          <Icon className="size-4 text-muted-foreground" />
          {month.label}
        </span>
        <span className="text-right">
          <span className="block text-lg font-bold tabular-nums">₹{formatInr(month.total)}</span>
          <span className="block text-xs text-muted-foreground">
            P&amp;L ₹{formatInr(month.pnlTotal)} · Entries ₹{formatInr(month.entriesTotal)}
          </span>
        </span>
      </button>
      {open ? (
        <CardContent className="grid gap-4 border-t pt-4 text-sm">
          <div className="grid gap-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Counted in Profit &amp; Loss
            </p>
            {month.pnlLines.map((line) => {
              const lineId = parseRunningCostLineId(line.id);
              return (
                <CostRow
                  key={line.id}
                  amount={line.amount}
                  actions={
                    lineId ? (
                      <RowActions
                        label={line.label}
                        onEdit={() => navigate(runningCostEditPath(lineId, month.key))}
                        onDelete={allowDelete ? () => onDelete({ kind: "line", month, line }) : undefined}
                      />
                    ) : null
                  }
                >
                  {line.label}
                  {line.overridden ? (
                    <Badge variant="secondary" className="ml-1.5 align-middle text-[10px]">
                      Edited
                    </Badge>
                  ) : null}
                </CostRow>
              );
            })}
          </div>
          <div className="grid gap-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Running cost entries
            </p>
            {month.entries.length === 0 ? (
              <p className="text-muted-foreground">No entries this month.</p>
            ) : (
              month.entries.map((entry) => (
                <CostRow
                  key={entry.id}
                  amount={entry.totalAmount}
                  actions={
                    <RowActions
                      label={entry.title?.trim() || entry.billNo}
                      onEdit={() => navigate(`/purchase/${entry.id}/edit`)}
                      onDelete={allowDelete ? () => onDelete({ kind: "entry", entry }) : undefined}
                    />
                  }
                >
                  <Link to={`/purchase/${entry.id}`} className="hover:underline">
                    {entry.title?.trim() || entry.billNo}
                  </Link>
                  <span className="text-muted-foreground">
                    {" "}
                    · {new Date(entry.billDate).toLocaleDateString("en-GB")}
                  </span>
                </CostRow>
              ))
            )}
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}

export function MonthlyRunningCostsPanel() {
  const { data, isLoading } = useRunningCosts();
  const allowDelete = canDelete(useAuthStore((state) => state.user));
  const setRunningCost = useSetRunningCost();
  const deleteBill = useDeletePurchaseBill();
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  function confirmDelete(pin: string) {
    if (!deleteTarget) return;
    const onError = (error: unknown) => toast.error(apiErrorMessage(error, "Failed to delete"));
    switch (deleteTarget.kind) {
      case "line": {
        const { month, line } = deleteTarget;
        const lineId = parseRunningCostLineId(line.id);
        if (!lineId) return;
        setRunningCost.mutate(
          { lineId, fromMonth: month.key, toMonth: month.key, amount: 0, pin },
          {
            onSuccess: () => {
              toast.success(`${line.label} removed from ${month.label}`);
              setDeleteTarget(null);
            },
            onError,
          }
        );
        return;
      }
      case "entry": {
        const { entry } = deleteTarget;
        deleteBill.mutate(
          { id: entry.id, pin },
          {
            onSuccess: () => {
              toast.success(`Bill ${entry.billNo} moved to recycle bin`);
              setDeleteTarget(null);
            },
            onError,
          }
        );
        return;
      }
      default: {
        const _exhaustive: never = deleteTarget;
        return _exhaustive;
      }
    }
  }

  if (isLoading && !data) {
    return (
      <div className="grid gap-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }
  if (!data) return null;

  const dialogCopy = deleteDialogCopy(deleteTarget);

  return (
    <div className="grid gap-3">
      <div className="grid min-w-0 grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: "In P&L", value: data.totals.pnl },
          { label: "Entries", value: data.totals.entries },
          { label: "Total", value: data.totals.combined },
        ].map((stat) => (
          <Card key={stat.label} className="min-w-0 overflow-hidden">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-muted-foreground sm:text-sm">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent className="truncate text-sm font-semibold tabular-nums sm:text-xl">
              ₹{formatInr(stat.value)}
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-xs text-muted-foreground">
          &quot;In P&amp;L&quot; is rent, salary, electricity, thekedar, delivery and partner expenses
          already used in <Link to="/profit-loss" className="text-primary underline-offset-2 hover:underline">Profit &amp; Loss</Link>.
          Entries are extra running-cost bills added here; they are not in P&amp;L yet.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 self-start"
          nativeButton={false}
          render={<Link to={runningCostEditPath()} />}
        >
          <Pencil className="size-3.5" />
          Edit running costs
        </Button>
      </div>
      {data.months.map((month, index) => (
        <MonthCard
          key={month.key}
          month={month}
          defaultOpen={index === 0}
          allowDelete={allowDelete}
          onDelete={setDeleteTarget}
        />
      ))}

      <ConfirmDeletePinDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={dialogCopy.title}
        description={dialogCopy.description}
        isPending={setRunningCost.isPending || deleteBill.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
