import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AdjustmentInput, StockMovement, StockRow } from "./types";

export function useStock() {
  return useQuery({
    queryKey: ["inventory", "stock"],
    queryFn: async () => {
      const { data } = await api.get<StockRow[]>("/inventory/stock");
      return data;
    },
  });
}

export function useStockMovements() {
  return useQuery({
    queryKey: ["inventory", "movements"],
    queryFn: async () => {
      const { data } = await api.get<StockMovement[]>("/inventory/movements");
      return data;
    },
  });
}

export function useCreateAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AdjustmentInput) => {
      const { data } = await api.post<StockMovement>("/inventory/adjustments", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
