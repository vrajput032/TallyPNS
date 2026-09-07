import { useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { isValueLoading } from "@/store/slices/helpers";
import { fetchInvestments } from "@/store/slices/investmentsSlice";

export function useInvestments() {
  const dispatch = useAppDispatch();
  const slot = useAppSelector((s) => s.investments.data);

  useEffect(() => {
    const silent = Boolean(slot.value);
    dispatch(fetchInvestments({ silent }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- slot.value would retrigger after every fetch
  }, [dispatch]);

  const refetch = useCallback(() => {
    dispatch(fetchInvestments({ silent: true }));
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
