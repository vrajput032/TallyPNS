import { useValueQuery } from "@/store/hooks/useReduxData";
import { fetchSalesByCustomer } from "@/store/slices/dashboardSlice";

export interface CustomerSalesPoint {
  customer: string;
  total: number;
}

export function useSalesByCustomer() {
  return useValueQuery<CustomerSalesPoint[]>(
    (s) => s.dashboard.salesByCustomer,
    fetchSalesByCustomer
  );
}
