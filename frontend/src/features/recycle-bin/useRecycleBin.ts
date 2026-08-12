import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PurchaseBill } from "@/features/purchase/types";
import type { SalesInvoice } from "@/features/sales/types";

export const RECYCLE_BIN_KEY = ["recycle-bin"];

export interface RecycleBinData {
  sales: SalesInvoice[];
  purchase: PurchaseBill[];
}

export function useRecycleBin() {
  return useQuery({
    queryKey: RECYCLE_BIN_KEY,
    queryFn: async () => {
      const { data } = await api.get<RecycleBinData>("/recycle-bin");
      return data;
    },
  });
}

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: RECYCLE_BIN_KEY });
  queryClient.invalidateQueries({ queryKey: ["sales"] });
  queryClient.invalidateQueries({ queryKey: ["purchase"] });
  queryClient.invalidateQueries({ queryKey: ["products"] });
  queryClient.invalidateQueries({ queryKey: ["inventory"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  queryClient.invalidateQueries({ queryKey: ["gst"] });
  queryClient.invalidateQueries({ queryKey: ["reports"] });
}

export function useRestoreSalesInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/sales/${id}/restore`);
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function usePermanentDeleteSalesInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, pin }: { id: string; pin: string }) => {
      await api.delete(`/sales/${id}/permanent`, { headers: { "X-Delete-Pin": pin } });
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useRestorePurchaseBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/purchase/${id}/restore`);
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function usePermanentDeletePurchaseBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, pin }: { id: string; pin: string }) => {
      await api.delete(`/purchase/${id}/permanent`, { headers: { "X-Delete-Pin": pin } });
    },
    onSuccess: () => invalidateAll(queryClient),
  });
}
