import { createTransform, type PersistConfig } from "redux-persist";
import createWebStorageImport from "redux-persist/lib/storage/createWebStorage";

const createWebStorage =
  typeof createWebStorageImport === "function"
    ? createWebStorageImport
    : (createWebStorageImport as { default: typeof createWebStorageImport }).default;

const storage = createWebStorage("local");

/** Slices cached in the browser — shown immediately while Render wakes, then refreshed in the background. */
export const PERSIST_SLICE_KEYS = [
  "customers",
  "products",
  "vendors",
  "sales",
  "purchase",
  "inventory",
  "dashboard",
  "payments",
  "rawMaterial",
  "ledger",
  "profitLoss",
  "investments",
  "reports",
  "recycleBin",
  "users",
  "activity",
  "commission",
] as const;

type PersistedState = Record<(typeof PERSIST_SLICE_KEYS)[number], unknown>;

function rehydrateSliceState(state: unknown): unknown {
  if (!state || typeof state !== "object") return state;
  const record = state as Record<string, unknown>;

  if ("items" in record && Array.isArray(record.items) && record.items.length > 0) {
    return { ...record, status: "succeeded", error: null };
  }
  if ("value" in record && record.value != null) {
    return { ...record, status: "succeeded", error: null };
  }

  let changed = false;
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    const normalized = rehydrateSliceState(value);
    next[key] = normalized;
    if (normalized !== value) changed = true;
  }
  return changed ? next : state;
}

const rehydrateTransform = createTransform(
  (inbound) => inbound,
  (outbound) => rehydrateSliceState(outbound),
  { whitelist: [...PERSIST_SLICE_KEYS] }
);

export const persistConfig: PersistConfig<PersistedState> = {
  key: "pns-erp-data",
  version: 1,
  storage,
  whitelist: [...PERSIST_SLICE_KEYS],
  transforms: [rehydrateTransform],
};
