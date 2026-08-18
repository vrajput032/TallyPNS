import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMonthlySales, type MonthlySalesPoint } from "./useMonthlySales";
import { formatInr } from "@/lib/formatInr";
import { usePrimaryColor } from "@/lib/usePrimaryColor";

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-sm shadow-lg">
      <p className="font-medium text-muted-foreground">{label}</p>
      <p className="text-base font-semibold">{formatInr(payload[0].value)}</p>
    </div>
  );
}

export function SalesChart({ months }: { months?: number }) {
  const { data, isLoading, error } = useMonthlySales();
  const primary = usePrimaryColor();

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border bg-card p-4 text-center">
        <p className="text-sm text-muted-foreground">Could not load sales data.</p>
      </div>
    );
  }

  const chartData: MonthlySalesPoint[] =
    data && data.length > 0
      ? data
      : Array.from({ length: months ?? 6 }, (_, i) => ({
          month: new Date(2026, i + 1, 1).toLocaleDateString("en-GB", {
            month: "short",
            year: "2-digit",
          }),
          total: 0,
        }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 16, bottom: 0 }}>
          <defs>
            <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={primary} stopOpacity={0.35} />
              <stop offset="95%" stopColor={primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.922 0 0 / 0.5)" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: "oklch(0.556 0 0)" }}
            axisLine={false}
            tickLine={false}
            dy={8}
          />
          <YAxis
            tickFormatter={(v: number) =>
              v >= 1_000_00
                ? `${(v / 1_000_00).toFixed(1)}L`
                : v >= 1_000
                  ? `${(v / 1_000).toFixed(0)}K`
                  : String(v)
            }
            tick={{ fontSize: 12, fill: "oklch(0.556 0 0)" }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: `${primary}66`, strokeWidth: 1.5 }} />
          <Area
            type="monotone"
            dataKey="total"
            stroke={primary}
            strokeWidth={2.5}
            fill="url(#salesGrad)"
            animationDuration={800}
            animationEasing="ease-out"
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, fill: primary }}
          />
        </AreaChart>
      </ResponsiveContainer>
      {isLoading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-card/60">
          <p className="text-sm text-muted-foreground">Loading chart...</p>
        </div>
      )}
    </div>
  );
}
