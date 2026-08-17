import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface CustomerSalesPoint {
  customer: string;
  total: number;
}

export function useSalesByCustomer() {
  return useQuery({
    queryKey: ["dashboard", "sales-by-customer"],
    queryFn: async () => {
      const { data } = await api.get<CustomerSalesPoint[]>("dashboard/sales/by-customer");
      return data;
    },
  });
}
