import { useListQuery, useEntityQuery, useAsyncMutation } from "@/store/hooks/useReduxData";
import type { PurchaseAttachment, PurchaseBill, PurchaseBillInput } from "@/features/purchase/types";
import {
  createPurchaseBill,
  deletePurchaseAttachment,
  deletePurchaseBill,
  fetchPurchaseBill,
  fetchPurchaseBills,
  updatePurchaseBill,
  uploadPurchaseAttachment,
} from "@/store/slices/purchaseSlice";

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
