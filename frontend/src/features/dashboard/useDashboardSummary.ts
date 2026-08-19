import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

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
  rawMaterial?: RawMaterialSummary;
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: async () => {
      const { data } = await api.get<DashboardSummary>("/dashboard/summary");
      return data;
    },
  });
}
