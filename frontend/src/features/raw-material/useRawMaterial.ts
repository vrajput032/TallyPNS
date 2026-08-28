import { useListQuery, useEntityQuery, useAsyncMutation } from "@/store/hooks/useReduxData";
import type {
  CreateRawMaterialPaymentInput,
  ParsedRawMaterialBill,
  RawMaterialBill,
  RawMaterialBillInput,
} from "@/features/raw-material/types";
import {
  createRawMaterialBill,
  createRawMaterialPayment,
  deleteRawMaterialBill,
  deleteRawMaterialPayment,
  fetchRawMaterialBill,
  fetchRawMaterialBills,
  parseRawMaterialBill,
  updateRawMaterialBill,
  updateRawMaterialPayment,
} from "@/store/slices/rawMaterialSlice";

export function useRawMaterialBills() {
  return useListQuery<RawMaterialBill>((s) => s.rawMaterial.list, fetchRawMaterialBills);
}

export function useRawMaterialBill(id: string | undefined) {
  return useEntityQuery<RawMaterialBill>(
    (s) => (id ? s.rawMaterial.byId[id] : undefined),
    fetchRawMaterialBill,
    id
  );
}

export function useParseRawMaterialBill() {
  return useAsyncMutation<File, ParsedRawMaterialBill>(parseRawMaterialBill);
}

export function useCreateRawMaterialBill() {
  return useAsyncMutation<RawMaterialBillInput, RawMaterialBill>(createRawMaterialBill);
}

export function useUpdateRawMaterialBill() {
  return useAsyncMutation<
    { id: string; pin: string; input: RawMaterialBillInput },
    RawMaterialBill
  >(updateRawMaterialBill);
}

export function useDeleteRawMaterialBill() {
  return useAsyncMutation<{ id: string; pin: string }, string>(deleteRawMaterialBill);
}

export function useCreateRawMaterialPayment() {
  return useAsyncMutation<
    { billId: string; input: CreateRawMaterialPaymentInput },
    RawMaterialBill
  >(createRawMaterialPayment);
}

export function useUpdateRawMaterialPayment() {
  return useAsyncMutation<
    { paymentId: string; input: CreateRawMaterialPaymentInput },
    RawMaterialBill
  >(updateRawMaterialPayment);
}

export function useDeleteRawMaterialPayment() {
  return useAsyncMutation<string, RawMaterialBill>(deleteRawMaterialPayment);
}
