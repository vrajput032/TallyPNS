import {
  useListQuery,
  useEntityQuery,
  useAsyncMutation,
  useValueQuery,
} from "@/store/hooks/useReduxData";
import type {
  ParsedSupplierInvoice,
  PurchaseAttachment,
  PurchaseBill,
  PurchaseBillInput,
  RunningCostRangeInput,
  RunningCostsSummary,
} from "@/features/purchase/types";
import {
  createPurchaseBill,
  deletePurchaseAttachment,
  deletePurchaseBill,
  fetchPurchaseBill,
  fetchPurchaseBills,
  fetchRunningCosts,
  parseSupplierBill,
  resetRunningCost,
  setRunningCost,
  updatePurchaseBill,
  uploadPurchaseAttachment,
} from "@/store/slices/purchaseSlice";

export function useRunningCosts() {
  return useValueQuery<RunningCostsSummary>((s) => s.purchase.runningCosts, fetchRunningCosts);
}

export function useSetRunningCost() {
  return useAsyncMutation<RunningCostRangeInput & { amount: number; pin: string }, string[]>(
    setRunningCost
  );
}

export function useResetRunningCost() {
  return useAsyncMutation<RunningCostRangeInput & { pin: string }, string[]>(resetRunningCost);
}

export function useParseSupplierBill() {
  return useAsyncMutation<File, ParsedSupplierInvoice>(parseSupplierBill);
}

export function usePurchaseBills() {
  return useListQuery<PurchaseBill>((s) => s.purchase.list, fetchPurchaseBills);
}

export function usePurchaseBill(id: string | undefined) {
  return useEntityQuery<PurchaseBill>(
    (s) => (id ? s.purchase.byId[id] : undefined),
    fetchPurchaseBill,
    id
  );
}

export function useCreatePurchaseBill() {
  return useAsyncMutation<PurchaseBillInput, PurchaseBill>(createPurchaseBill);
}

export function useUpdatePurchaseBill() {
  return useAsyncMutation<
    { id: string; pin: string; input: PurchaseBillInput },
    PurchaseBill
  >(updatePurchaseBill);
}

export function useDeletePurchaseBill() {
  return useAsyncMutation<{ id: string; pin: string }, string>(deletePurchaseBill);
}

export function useUploadPurchaseAttachment() {
  return useAsyncMutation<{ id: string; file: File }, PurchaseAttachment>(
    uploadPurchaseAttachment
  );
}

export function useDeletePurchaseAttachment() {
  return useAsyncMutation<{ billId: string; attachmentId: string }, string>(
    deletePurchaseAttachment
  );
}
