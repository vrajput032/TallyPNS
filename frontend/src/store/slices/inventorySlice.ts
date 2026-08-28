import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { AdjustmentInput, StockMovement, StockRow } from "@/features/inventory/types";
import { api } from "@/lib/api";
import { fetchProducts } from "./productsSlice";
import { fetchDashboardSummary } from "./dashboardSlice";
import {
  apiErrorMessage,
  initialListState,
  listPending,
  type ListState,
} from "./helpers";

type FetchArgs = { silent?: boolean };

interface InventoryState {
  stock: ListState<StockRow>;
  movements: ListState<StockMovement>;
}

const initialState: InventoryState = {
  stock: initialListState(),
  movements: initialListState(),
};

export const fetchStock = createAsyncThunk(
  "inventory/fetchStock",
  async (_args: FetchArgs | undefined, { rejectWithValue }) => {
    try {
      const { data } = await api.get<StockRow[]>("/inventory/stock");
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const fetchStockMovements = createAsyncThunk(
  "inventory/fetchMovements",
  async (_args: FetchArgs | undefined, { rejectWithValue }) => {
    try {
      const { data } = await api.get<StockMovement[]>("/inventory/movements");
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const createAdjustment = createAsyncThunk(
  "inventory/createAdjustment",
  async (input: AdjustmentInput, { rejectWithValue, dispatch }) => {
    try {
      const { data } = await api.post<StockMovement>("/inventory/adjustments", input);
      dispatch(fetchStock({ silent: true }));
      dispatch(fetchStockMovements({ silent: true }));
      dispatch(fetchProducts({ silent: true }));
      dispatch(fetchDashboardSummary({ silent: true }));
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

const inventorySlice = createSlice({
  name: "inventory",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStock.pending, (state, action) => {
        state.stock.status = listPending(
          state.stock.status,
          state.stock.items.length > 0,
          action.meta.arg?.silent
        );
        state.stock.error = null;
      })
      .addCase(fetchStock.fulfilled, (state, action) => {
        state.stock.items = action.payload;
        state.stock.status = "succeeded";
      })
      .addCase(fetchStock.rejected, (state, action) => {
        state.stock.status = "failed";
        state.stock.error = String(action.payload ?? action.error.message);
      })
      .addCase(fetchStockMovements.pending, (state, action) => {
        state.movements.status = listPending(
          state.movements.status,
          state.movements.items.length > 0,
          action.meta.arg?.silent
        );
        state.movements.error = null;
      })
      .addCase(fetchStockMovements.fulfilled, (state, action) => {
        state.movements.items = action.payload;
        state.movements.status = "succeeded";
      })
      .addCase(fetchStockMovements.rejected, (state, action) => {
        state.movements.status = "failed";
        state.movements.error = String(action.payload ?? action.error.message);
      });
  },
});

export default inventorySlice.reducer;
