import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  CreateRawMaterialPaymentInput,
  ParsedRawMaterialBill,
  RawMaterialBill,
  RawMaterialBillInput,
} from "./types";

const KEY = ["raw-material"];

export function useRawMaterialBills() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data } = await api.get<RawMaterialBill[]>("/raw-material", {
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });
      return data;
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
  });
}

export function useRawMaterialBill(id: string | undefined) {
  return useQuery({
    queryKey: [...KEY, id],
    queryFn: async () => {
      const { data } = await api.get<RawMaterialBill>(`/raw-material/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useParseRawMaterialBill() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post<ParsedRawMaterialBill>("/raw-material/parse", formData);
      return data;
    },
  });
}

export function useCreateRawMaterialBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RawMaterialBillInput) => {
      const { data } = await api.post<RawMaterialBill>("/raw-material", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useUpdateRawMaterialBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      pin,
      input,
    }: {
      id: string;
      pin: string;
      input: RawMaterialBillInput;
    }) => {
      const { data } = await api.put<RawMaterialBill>(`/raw-material/${id}`, input, {
        headers: { "X-Delete-Pin": pin },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useDeleteRawMaterialBill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, pin }: { id: string; pin: string }) => {
      await api.delete(`/raw-material/${id}`, { headers: { "X-Delete-Pin": pin } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useCreateRawMaterialPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      billId,
      input,
    }: {
      billId: string;
      input: CreateRawMaterialPaymentInput;
    }) => {
      const { data } = await api.post<RawMaterialBill>(`/raw-material/${billId}/payments`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useUpdateRawMaterialPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      paymentId,
      input,
    }: {
      paymentId: string;
      input: CreateRawMaterialPaymentInput;
    }) => {
      const { data } = await api.put<RawMaterialBill>(`/raw-material/payments/${paymentId}`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useDeleteRawMaterialPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (paymentId: string) => {
      const { data } = await api.delete<RawMaterialBill>(`/raw-material/payments/${paymentId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY });
    },
  });
}
