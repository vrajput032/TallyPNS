import { useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  useListQuery,
  useEntityQuery,
  useAsyncMutation,
} from "@/store/hooks/useReduxData";
import { isValueLoading } from "@/store/slices/helpers";
import type { SalesInvoice, SalesInvoiceInput } from "@/features/sales/types";
import {
  createSalesInvoice,
  deleteSalesInvoice,
  fetchNextInvoiceNo,
  fetchSalesInvoice,
  fetchSalesInvoices,
  updateSalesInvoice,
} from "@/store/slices/salesSlice";

export function useSalesInvoices() {
  return useListQuery<SalesInvoice>((s) => s.sales.list, fetchSalesInvoices);
}

export function useSalesInvoice(id: string | undefined) {
  return useEntityQuery<SalesInvoice>(
    (s) => (id ? s.sales.byId[id] : undefined),
    fetchSalesInvoice,
    id
  );
}

export function useNextInvoiceNo() {
  const dispatch = useAppDispatch();
  const slot = useAppSelector((s) => s.sales.nextInvoiceNo);

  useEffect(() => {
    dispatch(fetchNextInvoiceNo());
  }, [dispatch]);

  const refetch = useCallback(() => {
    dispatch(fetchNextInvoiceNo());
  }, [dispatch]);

  return {
    data: slot.value ?? undefined,
    isLoading: isValueLoading(slot),
    isFetching: slot.status === "loading",
    isError: slot.status === "failed",
    error: slot.error,
    refetch,
  };
}

export function useCreateSalesInvoice() {
  return useAsyncMutation<SalesInvoiceInput, SalesInvoice>(createSalesInvoice);
}

export function useUpdateSalesInvoice() {
  return useAsyncMutation<
    { id: string; pin: string; input: SalesInvoiceInput },
    SalesInvoice
  >(updateSalesInvoice);
}

export function useDeleteSalesInvoice() {
  return useAsyncMutation<{ id: string; pin: string }, string>(deleteSalesInvoice);
}
