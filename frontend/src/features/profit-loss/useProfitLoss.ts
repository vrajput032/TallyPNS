import { useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { isValueLoading } from "@/store/slices/helpers";
import {
  fetchMonthProfitLoss,
  fetchPnlSummary,
  pnlPeriodKey,
} from "@/store/slices/profitLossSlice";
import type { ScrapGrade } from "./types";

export function useMonthProfitLoss(month: number, year: number, scrapGrade: ScrapGrade) {
  const dispatch = useAppDispatch();
  const key = pnlPeriodKey(month, year, scrapGrade);
  const slot = useAppSelector((s) => s.profitLoss.byPeriod[key]);

  useEffect(() => {
    const silent = Boolean(slot?.value);
    dispatch(fetchMonthProfitLoss({ month, year, scrapGrade, silent }));
    // Refetch whenever the period changes so pns-expenses stay live.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- slot.value would retrigger after every fetch
  }, [dispatch, month, year, scrapGrade, key]);

  const refetch = useCallback(() => {
    dispatch(fetchMonthProfitLoss({ month, year, scrapGrade, silent: true }));
  }, [dispatch, month, year, scrapGrade]);

  return {
    data: slot?.value ?? undefined,
    isLoading: !slot || isValueLoading(slot),
    isFetching: slot?.status === "loading",
    isError: slot?.status === "failed",
    error: slot?.error ?? null,
    refetch,
  };
}

export function usePnlSummary(scrapGrade: ScrapGrade, enabled: boolean) {
  const dispatch = useAppDispatch();
  const slot = useAppSelector((s) => s.profitLoss.summaryByGrade[scrapGrade]);

  useEffect(() => {
    if (!enabled) return;
    const silent = Boolean(slot?.value);
    dispatch(fetchPnlSummary({ scrapGrade, silent }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- slot.value would retrigger after every fetch
  }, [dispatch, scrapGrade, enabled]);

  const refetch = useCallback(() => {
    dispatch(fetchPnlSummary({ scrapGrade, silent: true }));
  }, [dispatch, scrapGrade]);

  return {
    data: slot?.value ?? undefined,
    isLoading: !slot || isValueLoading(slot),
    isFetching: slot?.status === "loading",
    isError: slot?.status === "failed",
    error: slot?.error ?? null,
    refetch,
  };
}
