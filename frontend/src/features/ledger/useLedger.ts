import { useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useBlockingLoader, useValueQuery } from "@/store/hooks/useReduxData";
import { isValueLoading } from "@/store/slices/helpers";
import { fetchCustomerLedger, fetchLedgerList } from "@/store/slices/ledgerSlice";
import type { CustomerLedger, LedgerList } from "./types";

export function useLedgerList() {
  return useValueQuery<LedgerList>((s) => s.ledger.list, fetchLedgerList);
}

export function useCustomerLedger(customerId: string | undefined) {
  const dispatch = useAppDispatch();
  const slot = useAppSelector((s) => (customerId ? s.ledger.byCustomerId[customerId] : undefined));

  useEffect(() => {
    if (!customerId) return;
    if (!slot || slot.status === "idle") {
      dispatch(fetchCustomerLedger({ id: customerId }));
    }
  }, [dispatch, customerId, slot?.status]);

  const refetch = useCallback(() => {
    if (customerId) dispatch(fetchCustomerLedger({ id: customerId, silent: true }));
  }, [dispatch, customerId]);

  const isLoading = !customerId || !slot || isValueLoading(slot);
  useBlockingLoader(Boolean(customerId) && isLoading);

  return {
    data: slot?.value ?? undefined,
    isLoading,
    isFetching: slot?.status === "loading",
    isError: slot?.status === "failed",
    error: slot?.error ?? null,
    refetch,
  } satisfies {
    data: CustomerLedger | undefined;
    isLoading: boolean;
    isFetching: boolean;
    isError: boolean;
    error: string | null;
    refetch: () => void;
  };
}
