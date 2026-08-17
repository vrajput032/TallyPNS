import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface MonthlySalesPoint {
  month: string;
  total: number;
}

export function useMonthlySales() {
  return useQuery({
    queryKey: ["dashboard", "sales-monthly"],
    queryFn: async () => {
      const { data } = await api.get<MonthlySalesPoint[]>("/dashboard/sales/monthly");
      return data;
    },
  });
}
