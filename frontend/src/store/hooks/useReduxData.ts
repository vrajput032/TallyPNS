import { useCallback, useEffect, useState } from "react";
import type { AsyncThunk } from "@reduxjs/toolkit";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { RootState } from "@/store/store";
import {
  isListLoading,
  isValueLoading,
  type ListState,
  type ValueState,
} from "@/store/slices/helpers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyThunk = AsyncThunk<any, any, any>;

export function useListQuery<T>(
  selector: (state: RootState) => ListState<T>,
  fetchThunk: AnyThunk
) {
  const dispatch = useAppDispatch();
  const slice = useAppSelector(selector);

  useEffect(() => {
    if (slice.status === "idle") {
      dispatch(fetchThunk(undefined));
    }
  }, [dispatch, fetchThunk, slice.status]);

  const refetch = useCallback(() => {
    dispatch(fetchThunk({ silent: true }));
  }, [dispatch, fetchThunk]);

  return {
    data: slice.items,
    isLoading: isListLoading(slice),
    isFetching: slice.status === "loading",
    isError: slice.status === "failed",
    error: slice.error,
    refetch,
  };
}

export function useValueQuery<T>(
  selector: (state: RootState) => ValueState<T>,
  fetchThunk: AnyThunk,
  options?: { skip?: boolean }
) {
  const dispatch = useAppDispatch();
  const slot = useAppSelector(selector);

  useEffect(() => {
    if (options?.skip) return;
    if (slot.status === "idle") {
      dispatch(fetchThunk(undefined));
    }
  }, [dispatch, fetchThunk, slot.status, options?.skip]);

  const refetch = useCallback(() => {
    dispatch(fetchThunk({ silent: true }));
  }, [dispatch, fetchThunk]);

  return {
    data: slot.value ?? undefined,
    isLoading: isValueLoading(slot),
    isFetching: slot.status === "loading",
    isError: slot.status === "failed",
    error: slot.error,
    refetch,
  };
}

export function useAsyncMutation<TArg, TResult>(thunk: AnyThunk) {
  const dispatch = useAppDispatch();
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback(
    (
      arg: TArg,
      options?: { onSuccess?: (data: TResult) => void; onError?: (error: unknown) => void }
    ) => {
      setIsPending(true);
      dispatch(thunk(arg))
        .unwrap()
        .then((data: TResult) => options?.onSuccess?.(data))
        .catch((error: unknown) => options?.onError?.(error))
        .finally(() => setIsPending(false));
    },
    [dispatch, thunk]
  );

  const mutateAsync = useCallback(
    (arg: TArg) => {
      setIsPending(true);
      return dispatch(thunk(arg))
        .unwrap()
        .then((data: TResult) => data)
        .finally(() => setIsPending(false));
    },
    [dispatch, thunk]
  );

  return { mutate, mutateAsync, isPending, isLoading: isPending };
}

export function useEntityQuery<T>(
  selector: (state: RootState) => ValueState<T> | undefined,
  fetchThunk: AnyThunk,
  id: string | undefined
) {
  const dispatch = useAppDispatch();
  const slot = useAppSelector(selector);

  useEffect(() => {
    if (!id) return;
    if (!slot || slot.status === "idle") {
      dispatch(fetchThunk({ id }));
    }
  }, [dispatch, fetchThunk, id, slot?.status]);

  const refetch = useCallback(() => {
    if (id) dispatch(fetchThunk({ id, silent: true }));
  }, [dispatch, fetchThunk, id]);

  return {
    data: slot?.value ?? undefined,
    isLoading: !slot || isValueLoading(slot),
    isFetching: slot?.status === "loading",
    isError: slot?.status === "failed",
    error: slot?.error ?? null,
    refetch,
  };
}
