import { useListQuery, useAsyncMutation } from "@/store/hooks/useReduxData";
import type { AdjustmentInput, StockMovement, StockRow } from "@/features/inventory/types";
import {
  createAdjustment,
  fetchStock,
  fetchStockMovements,
} from "@/store/slices/inventorySlice";

export function useStock() {
  return useListQuery<StockRow>((s) => s.inventory.stock, fetchStock);
}

export function useStockMovements() {
  return useListQuery<StockMovement>((s) => s.inventory.movements, fetchStockMovements);
}

export function useCreateAdjustment() {
  return useAsyncMutation<AdjustmentInput, StockMovement>(createAdjustment);
}
