import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  CashBankBook,
  CreateReceiptInput,
  CreateVendorPaymentInput,
  PartyOutstanding,
  PaymentReceipt,
  VendorPayment,
} from "./types";

export function useCashBook() {
  return useQuery({
    queryKey: ["cash"],
    queryFn: async () => {
      const { data } = await api.get<CashBankBook>("/cash");
      return data;
    },
  });
}

export function useBankBook() {
  return useQuery({
    queryKey: ["bank"],
    queryFn: async () => {
      const { data } = await api.get<CashBankBook>("/bank");
      return data;
    },
  });
}

export function usePartyOutstanding() {
  return useQuery({
    queryKey: ["payments", "outstanding"],
    queryFn: async () => {
      const { data } = await api.get<PartyOutstanding>("/payments/outstanding");
      return data;
    },
  });
}

export function useCreateReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateReceiptInput) => {
      const { data } = await api.post<PaymentReceipt>("/payments/receipts", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["cash"] });
      queryClient.invalidateQueries({ queryKey: ["bank"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteReceipt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/payments/receipts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["cash"] });
      queryClient.invalidateQueries({ queryKey: ["bank"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

export function useCreateVendorPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateVendorPaymentInput) => {
      const { data } = await api.post<VendorPayment>("/payments/vendor-payments", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase"] });
      queryClient.invalidateQueries({ queryKey: ["cash"] });
      queryClient.invalidateQueries({ queryKey: ["bank"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useDeleteVendorPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/payments/vendor-payments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase"] });
      queryClient.invalidateQueries({ queryKey: ["cash"] });
      queryClient.invalidateQueries({ queryKey: ["bank"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}
