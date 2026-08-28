import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  PurchaseAttachment,
  PurchaseBill,
  PurchaseBillInput,
} from "@/features/purchase/types";
import { api } from "@/lib/api";
import { fetchProducts } from "./productsSlice";
import { fetchDashboardSummary } from "./dashboardSlice";
import {
  apiErrorMessage,
  initialListState,
  initialValueState,
  listPending,
  type ListState,
  type ValueState,
} from "./helpers";

type FetchArgs = { silent?: boolean };

interface PurchaseState {
  list: ListState<PurchaseBill>;
  byId: Record<string, ValueState<PurchaseBill>>;
}

const initialState: PurchaseState = {
  list: initialListState(),
  byId: {},
};

export const fetchPurchaseBills = createAsyncThunk(
  "purchase/fetchList",
  async (_args: FetchArgs | undefined, { rejectWithValue }) => {
    try {
      const { data } = await api.get<PurchaseBill[]>("/purchase");
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const fetchPurchaseBill = createAsyncThunk(
  "purchase/fetchOne",
  async ({ id, silent }: { id: string; silent?: boolean }, { rejectWithValue }) => {
    try {
      const { data } = await api.get<PurchaseBill>(`/purchase/${id}`);
      return { id, data, silent };
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const createPurchaseBill = createAsyncThunk(
  "purchase/create",
  async (input: PurchaseBillInput, { rejectWithValue, dispatch }) => {
    try {
      const { data } = await api.post<PurchaseBill>("/purchase", input);
      dispatch(fetchPurchaseBills({ silent: true }));
      dispatch(fetchProducts({ silent: true }));
      dispatch(fetchDashboardSummary({ silent: true }));
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const updatePurchaseBill = createAsyncThunk(
  "purchase/update",
  async (
    { id, pin, input }: { id: string; pin: string; input: PurchaseBillInput },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const { data } = await api.put<PurchaseBill>(`/purchase/${id}`, input, {
        headers: { "X-Delete-Pin": pin },
      });
      dispatch(fetchPurchaseBills({ silent: true }));
      dispatch(fetchProducts({ silent: true }));
      dispatch(fetchDashboardSummary({ silent: true }));
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const deletePurchaseBill = createAsyncThunk(
  "purchase/delete",
  async ({ id, pin }: { id: string; pin: string }, { rejectWithValue, dispatch }) => {
    try {
      await api.delete(`/purchase/${id}`, { headers: { "X-Delete-Pin": pin } });
      dispatch(fetchPurchaseBills({ silent: true }));
      dispatch(fetchProducts({ silent: true }));
      dispatch(fetchDashboardSummary({ silent: true }));
      return id;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const uploadPurchaseAttachment = createAsyncThunk(
  "purchase/uploadAttachment",
  async ({ id, file }: { id: string; file: File }, { rejectWithValue, dispatch }) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post<PurchaseAttachment>(`/purchase/${id}/attachments`, formData);
      dispatch(fetchPurchaseBill({ id, silent: true }));
      dispatch(fetchPurchaseBills({ silent: true }));
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const deletePurchaseAttachment = createAsyncThunk(
  "purchase/deleteAttachment",
  async (
    { billId, attachmentId }: { billId: string; attachmentId: string },
    { rejectWithValue, dispatch }
  ) => {
    try {
      await api.delete(`/purchase/${billId}/attachments/${attachmentId}`);
      dispatch(fetchPurchaseBill({ id: billId, silent: true }));
      dispatch(fetchPurchaseBills({ silent: true }));
      return attachmentId;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

const purchaseSlice = createSlice({
  name: "purchase",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPurchaseBills.pending, (state, action) => {
        state.list.status = listPending(
          state.list.status,
          state.list.items.length > 0,
          action.meta.arg?.silent
        );
        state.list.error = null;
      })
      .addCase(fetchPurchaseBills.fulfilled, (state, action) => {
        state.list.items = action.payload;
        state.list.status = "succeeded";
      })
      .addCase(fetchPurchaseBills.rejected, (state, action) => {
        state.list.status = "failed";
        state.list.error = String(action.payload ?? action.error.message);
      })
      .addCase(fetchPurchaseBill.pending, (state, action) => {
        const id = action.meta.arg.id;
        const entry = state.byId[id] ?? initialValueState<PurchaseBill>();
        entry.status = listPending(entry.status, entry.value != null, action.meta.arg.silent);
        entry.error = null;
        state.byId[id] = entry;
      })
      .addCase(
        fetchPurchaseBill.fulfilled,
        (state, action: PayloadAction<{ id: string; data: PurchaseBill }>) => {
          state.byId[action.payload.id] = {
            value: action.payload.data,
            status: "succeeded",
            error: null,
          };
        }
      )
      .addCase(fetchPurchaseBill.rejected, (state, action) => {
        const id = action.meta.arg.id;
        const entry = state.byId[id] ?? initialValueState<PurchaseBill>();
        entry.status = "failed";
        entry.error = String(action.payload ?? action.error.message);
        state.byId[id] = entry;
      });
  },
});

export default purchaseSlice.reducer;
