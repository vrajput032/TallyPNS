import { CircleDollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { RawMaterialSummary } from "./useDashboardSummary";

function formatInr(value: number) {
  return value.toLocaleString("en-IN");
}

interface RawMaterialPaymentCardProps {
  data?: RawMaterialSummary;
  isLoading: boolean;
}

export function RawMaterialPaymentCard({ data, isLoading }: RawMaterialPaymentCardProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="relative overflow-hidden border-border/40 bg-card/60 backdrop-blur-xl shadow-[0_4px_30px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle className="text-base font-medium">Raw Material Payments</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Skeleton className="h-20 w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.billCount === 0) return null;

  const paidPercent = data.totalBilled > 0 ? Math.round((data.totalPaid / data.totalBilled) * 100) : 0;

  return (
    <Card className="relative overflow-hidden border-border/40 bg-card/60 shadow-[0_4px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/20" />
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base font-medium">Raw Material Payments</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/raw-material")}
          className="text-xs"
        >
          View all
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-end justify-between text-sm">
            <span className="text-muted-foreground">{paidPercent}% paid</span>
            <span className="text-xs text-muted-foreground">{data.billCount} bills</span>
          </div>
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700 ease-out",
                paidPercent >= 100
                  ? "bg-green-500"
                  : paidPercent >= 50
                    ? "bg-primary"
                    : "bg-amber-500",
              )}
              style={{ width: `${Math.min(paidPercent, 100)}%` }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid min-w-0 grid-cols-3 gap-2">
          <div className="min-w-0 overflow-hidden rounded-xl bg-muted/60 px-2 py-3 text-center sm:px-3">
            <p className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-[11px]">
              Total billed
            </p>
            <p className="mt-1 truncate text-sm font-bold tabular-nums sm:text-xl">
              ₹{formatInr(data.totalBilled)}
            </p>
          </div>
          <div className="min-w-0 overflow-hidden rounded-xl bg-green-500/10 px-2 py-3 text-center sm:px-3">
            <p className="truncate text-[10px] font-medium uppercase tracking-wider text-green-600 dark:text-green-400 sm:text-[11px]">
              Paid
            </p>
            <p className="mt-1 truncate text-sm font-bold tabular-nums text-green-600 dark:text-green-400 sm:text-xl">
              ₹{formatInr(data.totalPaid)}
            </p>
          </div>
          <div className="min-w-0 overflow-hidden rounded-xl bg-red-500/10 px-2 py-3 text-center sm:px-3">
            <p className="truncate text-[10px] font-medium uppercase tracking-wider text-red-600 dark:text-red-400 sm:text-[11px]">
              Balance
            </p>
            <p className="mt-1 truncate text-sm font-bold tabular-nums text-red-600 dark:text-red-400 sm:text-xl">
              ₹{formatInr(data.balance)}
            </p>
          </div>
        </div>

        {/* Quick action */}
        {data.balance > 0 && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate("/raw-material")}
          >
            <CircleDollarSign className="size-4" />
            Record payment
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
