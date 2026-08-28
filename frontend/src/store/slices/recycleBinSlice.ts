import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PurchaseBill } from "@/features/purchase/types";
import type { SalesInvoice } from "@/features/sales/types";
import { api } from "@/lib/api";
import { fetchSalesInvoices } from "./salesSlice";
import { fetchPurchaseBills } from "./purchaseSlice";
import { fetchProducts } from "./productsSlice";
import { fetchStock } from "./inventorySlice";
import { fetchStockMovements } from "./inventorySlice";
import { fetchDashboardSummary } from "./dashboardSlice";
import {
  apiErrorMessage,
  initialValueState,
  listPending,
  type ValueState,
} from "./helpers";

type FetchArgs = { silent?: boolean };

export interface RecycleBinData {
  sales: SalesInvoice[];
  purchase: PurchaseBill[];
}

interface RecycleBinState {
  data: ValueState<RecycleBinData>;
}

const initialState: RecycleBinState = {
  data: initialValueState(),
};

export const fetchRecycleBin = createAsyncThunk(
  "recycleBin/fetch",
  async (_args: FetchArgs | undefined, { rejectWithValue }) => {
    try {
      const { data } = await api.get<RecycleBinData>("/recycle-bin");
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

function refreshAll(dispatch: (action: unknown) => void) {
  dispatch(fetchRecycleBin({ silent: true }));
  dispatch(fetchSalesInvoices({ silent: true }));
  dispatch(fetchPurchaseBills({ silent: true }));
  dispatch(fetchProducts({ silent: true }));
  dispatch(fetchStock({ silent: true }));
  dispatch(fetchStockMovements({ silent: true }));
  dispatch(fetchDashboardSummary({ silent: true }));
}

export const restoreSalesInvoice = createAsyncThunk(
  "recycleBin/restoreSales",
  async (id: string, { rejectWithValue, dispatch }) => {
    try {
      await api.post(`/sales/${id}/restore`);
      refreshAll(dispatch);
      return id;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const permanentDeleteSalesInvoice = createAsyncThunk(
  "recycleBin/permanentDeleteSales",
  async ({ id, pin }: { id: string; pin: string }, { rejectWithValue, dispatch }) => {
    try {
      await api.delete(`/sales/${id}/permanent`, { headers: { "X-Delete-Pin": pin } });
      dispatch(fetchRecycleBin({ silent: true }));
      return id;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const restorePurchaseBill = createAsyncThunk(
  "recycleBin/restorePurchase",
  async (id: string, { rejectWithValue, dispatch }) => {
    try {
      await api.post(`/purchase/${id}/restore`);
      refreshAll(dispatch);
      return id;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const permanentDeletePurchaseBill = createAsyncThunk(
  "recycleBin/permanentDeletePurchase",
  async ({ id, pin }: { id: string; pin: string }, { rejectWithValue, dispatch }) => {
    try {
      await api.delete(`/purchase/${id}/permanent`, { headers: { "X-Delete-Pin": pin } });
      dispatch(fetchRecycleBin({ silent: true }));
      return id;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

const recycleBinSlice = createSlice({
  name: "recycleBin",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRecycleBin.pending, (state, action) => {
        state.data.status = listPending(
          state.data.status,
          state.data.value != null,
          action.meta.arg?.silent
        );
        state.data.error = null;
      })
      .addCase(fetchRecycleBin.fulfilled, (state, action) => {
        state.data = { value: action.payload, status: "succeeded", error: null };
      })
      .addCase(fetchRecycleBin.rejected, (state, action) => {
        state.data.status = "failed";
        state.data.error = String(action.payload ?? action.error.message);
      });
  },
});

export default recycleBinSlice.reducer;
