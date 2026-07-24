import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PurchaseBill, PurchaseBillInput } from "./types";

const PURCHASE_KEY = ["purchase"];

export function usePurchaseBills() {
  return useQuery({
    queryKey: PURCHASE_KEY,
    queryFn: async () => {
      const { data } = await api.get<PurchaseBill[]>("/purchase");
      return data;
    },
  });
}

export function usePurchaseBill(id: string | undefined) {
  return useQuery({
    queryKey: [...PURCHASE_KEY, id],
    queryFn: async () => {
      const { data } = await api.get<PurchaseBill>(`/purchase/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreatePurchaseBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PurchaseBillInput) => {
      const { data } = await api.post<PurchaseBill>("/purchase", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PURCHASE_KEY });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeletePurchaseBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/purchase/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PURCHASE_KEY });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["gst"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}
