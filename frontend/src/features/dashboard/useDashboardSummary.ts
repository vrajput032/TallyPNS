import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface DashboardSummary {
  customerCount: number;
  productCount: number;
  stockValue: number;
  lowStockCount: number;
  totalSales: number;
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
