import { useValueQuery } from "@/store/hooks/useReduxData";
import { fetchDashboardSummary } from "@/store/slices/dashboardSlice";

export interface RawMaterialSummary {
  totalBilled: number;
  totalPaid: number;
  balance: number;
  billCount: number;
}

export interface DashboardSummary {
  customerCount: number;
  productCount: number;
  stockValue: number;
  stockBySize: { sizeMm: number; quantity: number }[];
  lowStockCount: number;
  totalSales: number;
  totalReceived: number;
  rawMaterial?: RawMaterialSummary;
}

export function useDashboardSummary() {
  return useValueQuery<DashboardSummary>((s) => s.dashboard.summary, fetchDashboardSummary);
}
