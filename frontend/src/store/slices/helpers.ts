export type LoadStatus = "idle" | "loading" | "succeeded" | "failed";

export interface ListState<T> {
  items: T[];
  status: LoadStatus;
  error: string | null;
}

export interface ValueState<T> {
  value: T | null;
  status: LoadStatus;
  error: string | null;
}

export function initialListState<T>(): ListState<T> {
  return { items: [], status: "idle", error: null };
}

export function initialValueState<T>(): ValueState<T> {
  return { value: null, status: "idle", error: null };
}

/** Show full-page / section loader only when we have nothing cached yet. */
export function isListLoading<T>(state: ListState<T>): boolean {
  return state.status === "loading" && state.items.length === 0;
}

export function isValueLoading<T>(state: ValueState<T>): boolean {
  return state.status === "loading" && state.value == null;
}

export function listPending(status: LoadStatus, hasData: boolean, silent?: boolean): LoadStatus {
  if (silent && hasData) return status;
  return "loading";
}

export function apiErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: string }).message);
  }
  return "Request failed";
}
