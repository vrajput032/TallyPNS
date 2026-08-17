import { IndianRupee, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const { data, isLoading } = useDashboardSummary();
  const totalSales = data?.totalSales ?? 0;

  return (
    <div className="grid gap-4">
      <PageHeader title="Dashboard" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <StatCard
          label="Stock Value"
          value={(data?.stockValue ?? 0).toLocaleString("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
          })}
          icon={IndianRupee}
          isLoading={isLoading}
        />
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
