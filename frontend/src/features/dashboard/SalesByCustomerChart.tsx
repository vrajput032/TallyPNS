import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSalesByCustomer, type CustomerSalesPoint } from "./useSalesByCustomer";
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

function hexToOklch(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "oklch(0.488 0.243 264.376)";
  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const c = l > 0.5 ? 0.15 : 0.2;
  return `oklch(${(l * 0.7 + 0.15).toFixed(3)} ${c.toFixed(2)} 0)`;
}

function generatePalette(primaryHex: string, count: number): string[] {
  const base = hexToOklch(primaryHex);
  const m = base.match(/oklch\(([^)]+)\)/);
  if (!m) return Array.from({ length: count }, (_, i) => base);
  const parts = m[1].split(/\s+/);
  const baseL = parseFloat(parts[0]);
  const baseC = parseFloat(parts[1]);
  const baseH = parseFloat(parts[2]);
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    const h = (baseH + i * 40) % 360;
    const l = Math.min(0.75, baseL + i * 0.06);
    const c = Math.max(0.12, baseC - i * 0.015);
    colors.push(`oklch(${l.toFixed(3)} ${c.toFixed(3)} ${h.toFixed(1)})`);
  }
  return colors;
}

function truncateLabel(name: string, max = 12) {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

export function SalesByCustomerChart() {
  const { data, isLoading, error } = useSalesByCustomer();
  const primary = usePrimaryColor();
  const palette = generatePalette(primary, 8);

  if (error) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border bg-card p-4 text-center">
        <p className="text-sm text-muted-foreground">Could not load customer sales data.</p>
      </div>
    );
  }

  const chartData: CustomerSalesPoint[] = data ?? [];

  return (
    <div className="relative h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 8, right: 8, left: 16, bottom: 8 }}
          barGap={4}
        >
          <defs>
            {palette.map((color, i) => (
              <linearGradient key={i} id={`barGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={1} />
                <stop offset="100%" stopColor={color} stopOpacity={0.55} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.922 0 0 / 0.5)" vertical={false} />
          <XAxis
            dataKey="customer"
            tick={{ fontSize: 12, fill: "oklch(0.556 0 0)" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: string) => truncateLabel(v)}
            dy={4}
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
            width={40}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "oklch(0.556 0 0 / 0.08)" }}
          />
          <Bar
            dataKey="total"
            radius={[6, 6, 0, 0]}
            animationDuration={800}
            animationEasing="ease-out"
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={`url(#barGrad${i % palette.length})`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {isLoading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-card/60">
          <p className="text-sm text-muted-foreground">Loading chart...</p>
        </div>
      )}
      {chartData.length === 0 && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No sales data yet.</p>
        </div>
      )}
    </div>
  );
}
