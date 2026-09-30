import { useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useBlockingLoader } from "@/store/hooks/useReduxData";
import { isValueLoading } from "@/store/slices/helpers";
import { fetchMonthProfitLoss, fetchPnlSummary, pnlPeriodKey } from "@/store/slices/profitLossSlice";

export function useMonthProfitLoss(month: number, year: number) {
  const dispatch = useAppDispatch();
  const key = pnlPeriodKey(month, year);
  const slot = useAppSelector((s) => s.profitLoss.byPeriod[key]);

  useEffect(() => {
    const silent = Boolean(slot?.value);
    dispatch(fetchMonthProfitLoss({ month, year, silent }));
    // Refetch whenever the period changes so pns-expenses stay live.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- slot.value would retrigger after every fetch
  }, [dispatch, month, year, key]);

  const refetch = useCallback(() => {
    dispatch(fetchMonthProfitLoss({ month, year, silent: true }));
  }, [dispatch, month, year]);

  const isLoading = !slot || isValueLoading(slot);
  useBlockingLoader(isLoading);

  return {
    data: slot?.value ?? undefined,
    isLoading,
    isFetching: slot?.status === "loading",
    isError: slot?.status === "failed",
    error: slot?.error ?? null,
    refetch,
  };
}

export function usePnlSummary(enabled: boolean) {
  const dispatch = useAppDispatch();
  const slot = useAppSelector((s) => s.profitLoss.summary);

  useEffect(() => {
    if (!enabled) return;
    const silent = Boolean(slot.value);
    dispatch(fetchPnlSummary({ silent }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- slot.value would retrigger after every fetch
  }, [dispatch, enabled]);

  const refetch = useCallback(() => {
    dispatch(fetchPnlSummary({ silent: true }));
  }, [dispatch]);

  const isLoading = isValueLoading(slot);
  useBlockingLoader(enabled && isLoading);

  return {
    data: slot.value ?? undefined,
    isLoading,
    isFetching: slot.status === "loading",
    isError: slot.status === "failed",
    error: slot.error ?? null,
    refetch,
  };
}
