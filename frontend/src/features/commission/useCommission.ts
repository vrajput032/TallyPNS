import { useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useAsyncMutation, useBlockingLoader, useEntityQuery } from "@/store/hooks/useReduxData";
import { isValueLoading } from "@/store/slices/helpers";
import {
  commissionSummaryKey,
  createCommissionPayment,
  deleteCommissionEntry,
  deleteCommissionPayment,
  fetchCommissionStatement,
  fetchCommissionSummary,
  saveCommissionEntry,
} from "@/store/slices/commissionSlice";
import type {
  CommissionEntryInput,
  CommissionPaymentInput,
  CommissionStatement,
} from "./types";

export function useCommissionSummary(month?: string) {
  const dispatch = useAppDispatch();
  const key = commissionSummaryKey(month);
  const slot = useAppSelector((s) => s.commission.summaries[key]);

  useEffect(() => {
    dispatch(fetchCommissionSummary({ month, silent: Boolean(slot?.value) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- slot.value would retrigger after every fetch
  }, [dispatch, key]);

  const refetch = useCallback(() => {
    dispatch(fetchCommissionSummary({ month, silent: true }));
  }, [dispatch, month]);

  const isLoading = !slot || isValueLoading(slot);
  useBlockingLoader(isLoading);

  return {
    data: slot?.value ?? undefined,
    isLoading,
    refetch,
  };
}

export function useCommissionStatement(customerId: string | undefined) {
  return useEntityQuery<CommissionStatement>(
    (s) => (customerId ? s.commission.statements[customerId] : undefined),
    fetchCommissionStatement,
    customerId
  );
}

export function useSaveCommissionEntry() {
  return useAsyncMutation<{ id?: string; input: CommissionEntryInput }, { id: string }>(
    saveCommissionEntry
  );
}

export function useDeleteCommissionEntry() {
  return useAsyncMutation<{ id: string; customerId: string }, string>(deleteCommissionEntry);
}

export function useCreateCommissionPayment() {
  return useAsyncMutation<CommissionPaymentInput, { id: string; paymentNo: string }>(
    createCommissionPayment
  );
}

export function useDeleteCommissionPayment() {
  return useAsyncMutation<{ id: string; customerId: string }, string>(deleteCommissionPayment);
}
