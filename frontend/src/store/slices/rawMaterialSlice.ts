import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  CreateRawMaterialPaymentInput,
  ParsedRawMaterialBill,
  RawMaterialBill,
  RawMaterialBillInput,
} from "@/features/raw-material/types";
import { api } from "@/lib/api";
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

interface RawMaterialState {
  list: ListState<RawMaterialBill>;
  byId: Record<string, ValueState<RawMaterialBill>>;
}

const initialState: RawMaterialState = {
  list: initialListState(),
  byId: {},
};

export const fetchRawMaterialBills = createAsyncThunk(
  "rawMaterial/fetchList",
  async (_args: FetchArgs | undefined, { rejectWithValue }) => {
    try {
      const { data } = await api.get<RawMaterialBill[]>("/raw-material");
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const fetchRawMaterialBill = createAsyncThunk(
  "rawMaterial/fetchOne",
  async ({ id, silent }: { id: string; silent?: boolean }, { rejectWithValue }) => {
    try {
      const { data } = await api.get<RawMaterialBill>(`/raw-material/${id}`);
      return { id, data, silent };
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const parseRawMaterialBill = createAsyncThunk(
  "rawMaterial/parse",
  async (file: File, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post<ParsedRawMaterialBill>("/raw-material/parse", formData);
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const createRawMaterialBill = createAsyncThunk(
  "rawMaterial/create",
  async (input: RawMaterialBillInput, { rejectWithValue, dispatch }) => {
    try {
      const { data } = await api.post<RawMaterialBill>("/raw-material", input);
      dispatch(fetchRawMaterialBills({ silent: true }));
      dispatch(fetchDashboardSummary({ silent: true }));
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const updateRawMaterialBill = createAsyncThunk(
  "rawMaterial/update",
  async (
    { id, pin, input }: { id: string; pin: string; input: RawMaterialBillInput },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const { data } = await api.put<RawMaterialBill>(`/raw-material/${id}`, input, {
        headers: { "X-Delete-Pin": pin },
      });
      dispatch(fetchRawMaterialBills({ silent: true }));
      dispatch(fetchRawMaterialBill({ id, silent: true }));
      dispatch(fetchDashboardSummary({ silent: true }));
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const deleteRawMaterialBill = createAsyncThunk(
  "rawMaterial/delete",
  async ({ id, pin }: { id: string; pin: string }, { rejectWithValue, dispatch }) => {
    try {
      await api.delete(`/raw-material/${id}`, { headers: { "X-Delete-Pin": pin } });
      dispatch(fetchRawMaterialBills({ silent: true }));
      dispatch(fetchDashboardSummary({ silent: true }));
      return id;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const createRawMaterialPayment = createAsyncThunk(
  "rawMaterial/createPayment",
  async (
    { billId, input }: { billId: string; input: CreateRawMaterialPaymentInput },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const { data } = await api.post<RawMaterialBill>(`/raw-material/${billId}/payments`, input);
      dispatch(fetchRawMaterialBills({ silent: true }));
      dispatch(fetchRawMaterialBill({ id: billId, silent: true }));
      dispatch(fetchDashboardSummary({ silent: true }));
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const updateRawMaterialPayment = createAsyncThunk(
  "rawMaterial/updatePayment",
  async (
    { paymentId, input }: { paymentId: string; input: CreateRawMaterialPaymentInput },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const { data } = await api.put<RawMaterialBill>(`/raw-material/payments/${paymentId}`, input);
      dispatch(fetchRawMaterialBills({ silent: true }));
      dispatch(fetchDashboardSummary({ silent: true }));
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const deleteRawMaterialPayment = createAsyncThunk(
  "rawMaterial/deletePayment",
  async (paymentId: string, { rejectWithValue, dispatch }) => {
    try {
      const { data } = await api.delete<RawMaterialBill>(`/raw-material/payments/${paymentId}`);
      dispatch(fetchRawMaterialBills({ silent: true }));
      dispatch(fetchDashboardSummary({ silent: true }));
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

const rawMaterialSlice = createSlice({
  name: "rawMaterial",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRawMaterialBills.pending, (state, action) => {
        state.list.status = listPending(
          state.list.status,
          state.list.items.length > 0,
          action.meta.arg?.silent
        );
        state.list.error = null;
      })
      .addCase(fetchRawMaterialBills.fulfilled, (state, action) => {
        state.list.items = action.payload;
        state.list.status = "succeeded";
      })
      .addCase(fetchRawMaterialBills.rejected, (state, action) => {
        state.list.status = "failed";
        state.list.error = String(action.payload ?? action.error.message);
      })
      .addCase(fetchRawMaterialBill.pending, (state, action) => {
        const id = action.meta.arg.id;
        const entry = state.byId[id] ?? initialValueState<RawMaterialBill>();
        entry.status = listPending(entry.status, entry.value != null, action.meta.arg.silent);
        entry.error = null;
        state.byId[id] = entry;
      })
      .addCase(
        fetchRawMaterialBill.fulfilled,
        (state, action: PayloadAction<{ id: string; data: RawMaterialBill }>) => {
          state.byId[action.payload.id] = {
            value: action.payload.data,
            status: "succeeded",
            error: null,
          };
        }
      )
      .addCase(fetchRawMaterialBill.rejected, (state, action) => {
        const id = action.meta.arg.id;
        const entry = state.byId[id] ?? initialValueState<RawMaterialBill>();
        entry.status = "failed";
        entry.error = String(action.payload ?? action.error.message);
        state.byId[id] = entry;
      });
  },
});

export default rawMaterialSlice.reducer;
