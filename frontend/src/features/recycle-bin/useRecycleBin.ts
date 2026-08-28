import { useValueQuery, useAsyncMutation } from "@/store/hooks/useReduxData";
import type { RecycleBinData } from "@/store/slices/recycleBinSlice";
import {
  fetchRecycleBin,
  permanentDeletePurchaseBill,
  permanentDeleteSalesInvoice,
  restorePurchaseBill,
  restoreSalesInvoice,
} from "@/store/slices/recycleBinSlice";

export type { RecycleBinData } from "@/store/slices/recycleBinSlice";

export function useRecycleBin() {
  return useValueQuery<RecycleBinData>((s) => s.recycleBin.data, fetchRecycleBin);
}

export function useRestoreSalesInvoice() {
  return useAsyncMutation<string, string>(restoreSalesInvoice);
}

export function usePermanentDeleteSalesInvoice() {
  return useAsyncMutation<{ id: string; pin: string }, string>(permanentDeleteSalesInvoice);
}

export function useRestorePurchaseBill() {
  return useAsyncMutation<string, string>(restorePurchaseBill);
}

export function usePermanentDeletePurchaseBill() {
  return useAsyncMutation<{ id: string; pin: string }, string>(permanentDeletePurchaseBill);
}
