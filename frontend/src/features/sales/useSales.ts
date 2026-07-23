import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { SalesInvoice, SalesInvoiceInput } from "./types";

const SALES_KEY = ["sales"];

export function useSalesInvoices() {
  return useQuery({
    queryKey: SALES_KEY,
    queryFn: async () => {
      const { data } = await api.get<SalesInvoice[]>("/sales");
      return data;
    },
  });
}

export function useSalesInvoice(id: string | undefined) {
  return useQuery({
    queryKey: [...SALES_KEY, id],
    queryFn: async () => {
      const { data } = await api.get<SalesInvoice>(`/sales/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateSalesInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SalesInvoiceInput) => {
      const { data } = await api.post<SalesInvoice>("/sales", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SALES_KEY });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
