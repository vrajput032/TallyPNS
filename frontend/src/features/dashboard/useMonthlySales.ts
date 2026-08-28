import { useValueQuery } from "@/store/hooks/useReduxData";
import { fetchMonthlySales } from "@/store/slices/dashboardSlice";

export interface MonthlySalesPoint {
  month: string;
  total: number;
}

export function useMonthlySales() {
  return useValueQuery<MonthlySalesPoint[]>((s) => s.dashboard.monthlySales, fetchMonthlySales);
}
