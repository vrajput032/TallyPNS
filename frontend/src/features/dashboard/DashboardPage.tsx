import { Package, TrendingUp, Warehouse } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPipeSize, LOW_STOCK_QTY, PIPE_SIZES_MM } from "@/lib/pipeSizes";
import { StatCard } from "./StatCard";
import { SalesChart } from "./SalesChart";
import { SalesByCustomerChart } from "./SalesByCustomerChart";
import { useDashboardSummary } from "./useDashboardSummary";

function AnimatedCount({ target, prefix = "", suffix = "" }: { target: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 900;
    const start = performance.now();
    const from = display;
    const to = target;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target]);

  return (
    <span>
      {prefix}
      {display.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useDashboardSummary();
  const totalSales = data?.totalSales ?? 0;
  const stockBySize = data?.stockBySize ?? PIPE_SIZES_MM.map((sizeMm) => ({ sizeMm, quantity: 0 }));

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Dashboard"
        actions={
          <>
            <Button variant="outline" onClick={() => navigate("/sales")}>
              <TrendingUp className="size-4" />
              Sales
            </Button>
            <Button variant="outline" onClick={() => navigate("/inventory")}>
              <Warehouse className="size-4" />
              Inventory
            </Button>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Total Sales"
          value={
            <AnimatedCount
              target={totalSales}
              prefix="₹"
            />
          }
          icon={TrendingUp}
          isLoading={isLoading}
        />
        {stockBySize.map((row) => (
          <StatCard
            key={row.sizeMm}
            label={formatPipeSize(row.sizeMm)}
            value={<AnimatedCount target={Math.round(row.quantity)} />}
            icon={Package}
            isLoading={isLoading}
            valueClassName={row.quantity < LOW_STOCK_QTY ? "text-red-600" : undefined}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Sales Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <SalesChart />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Sales by Customer</CardTitle>
        </CardHeader>
        <CardContent>
          <SalesByCustomerChart />
        </CardContent>
      </Card>
    </div>
  );
}
