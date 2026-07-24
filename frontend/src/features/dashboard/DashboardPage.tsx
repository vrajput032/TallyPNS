import { AlertTriangle, IndianRupee, Package, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "./StatCard";
import { useDashboardSummary } from "./useDashboardSummary";

export function DashboardPage() {
  const { data, isLoading } = useDashboardSummary();

  return (
    <div className="grid gap-4">
      <PageHeader title="Dashboard" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Customers"
          value={String(data?.customerCount ?? 0)}
          icon={Users}
          isLoading={isLoading}
        />
        <StatCard
          label="Products"
          value={String(data?.productCount ?? 0)}
          icon={Package}
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
        <StatCard
          label="Low Stock Items"
          value={String(data?.lowStockCount ?? 0)}
          icon={AlertTriangle}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
