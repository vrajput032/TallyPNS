import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type {
  CustomerLedger,
  LedgerList,
  SupplierLedger,
  SupplierLedgerList,
} from "@/features/ledger/types";
import { api } from "@/lib/api";
import {
  apiErrorMessage,
  initialValueState,
  listPending,
  type ValueState,
} from "./helpers";

type FetchArgs = { silent?: boolean };

interface LedgerState {
  list: ValueState<LedgerList>;
  byCustomerId: Record<string, ValueState<CustomerLedger>>;
  supplierList: ValueState<SupplierLedgerList>;
  bySupplierKey: Record<string, ValueState<SupplierLedger>>;
}

const initialState: LedgerState = {
  list: initialValueState(),
  byCustomerId: {},
  supplierList: initialValueState(),
  bySupplierKey: {},
};

export const fetchLedgerList = createAsyncThunk(
  "ledger/fetchList",
  async (_args: FetchArgs | undefined, { rejectWithValue }) => {
    try {
      const { data } = await api.get<LedgerList>("/ledger");
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const fetchCustomerLedger = createAsyncThunk(
  "ledger/fetchOne",
  async ({ id }: { id: string; silent?: boolean }, { rejectWithValue }) => {
    try {
      const { data } = await api.get<CustomerLedger>(`/ledger/${id}`);
      return { id, data };
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const fetchSupplierLedgerList = createAsyncThunk(
  "ledger/fetchSupplierList",
  async (_args: FetchArgs | undefined, { rejectWithValue }) => {
    try {
      const { data } = await api.get<SupplierLedgerList>("/ledger/suppliers");
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const fetchSupplierLedger = createAsyncThunk(
  "ledger/fetchSupplier",
  async ({ id }: { id: string; silent?: boolean }, { rejectWithValue }) => {
    try {
      const { data } = await api.get<SupplierLedger>(`/ledger/suppliers/${encodeURIComponent(id)}`);
      return { id, data };
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

const ledgerSlice = createSlice({
  name: "ledger",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLedgerList.pending, (state, action) => {
        state.list.status = listPending(
          state.list.status,
          state.list.value != null,
          action.meta.arg?.silent
        );
        state.list.error = null;
      })
      .addCase(fetchLedgerList.fulfilled, (state, action) => {
        state.list.value = action.payload;
        state.list.status = "succeeded";
      })
      .addCase(fetchLedgerList.rejected, (state, action) => {
        state.list.status = "failed";
        state.list.error = String(action.payload ?? action.error.message);
      })
      .addCase(fetchCustomerLedger.pending, (state, action) => {
        const key = action.meta.arg.id;
        const entry = state.byCustomerId[key] ?? initialValueState<CustomerLedger>();
        entry.status = listPending(entry.status, entry.value != null, action.meta.arg.silent);
        entry.error = null;
        state.byCustomerId[key] = entry;
      })
      .addCase(fetchCustomerLedger.fulfilled, (state, action) => {
        state.byCustomerId[action.payload.id] = {
          value: action.payload.data,
          status: "succeeded",
          error: null,
        };
      })
      .addCase(fetchCustomerLedger.rejected, (state, action) => {
        const key = action.meta.arg.id;
        const entry = state.byCustomerId[key] ?? initialValueState<CustomerLedger>();
        entry.status = "failed";
        entry.error = String(action.payload ?? action.error.message);
        state.byCustomerId[key] = entry;
      })
      .addCase(fetchSupplierLedgerList.pending, (state, action) => {
        state.supplierList.status = listPending(
          state.supplierList.status,
          state.supplierList.value != null,
          action.meta.arg?.silent
        );
        state.supplierList.error = null;
      })
      .addCase(fetchSupplierLedgerList.fulfilled, (state, action) => {
        state.supplierList = { value: action.payload, status: "succeeded", error: null };
      })
      .addCase(fetchSupplierLedgerList.rejected, (state, action) => {
        state.supplierList.status = "failed";
        state.supplierList.error = String(action.payload ?? action.error.message);
      })
      .addCase(fetchSupplierLedger.pending, (state, action) => {
        const key = action.meta.arg.id;
        const entry = state.bySupplierKey[key] ?? initialValueState<SupplierLedger>();
        entry.status = listPending(entry.status, entry.value != null, action.meta.arg.silent);
        entry.error = null;
        state.bySupplierKey[key] = entry;
      })
      .addCase(fetchSupplierLedger.fulfilled, (state, action) => {
        state.bySupplierKey[action.payload.id] = {
          value: action.payload.data,
          status: "succeeded",
          error: null,
        };
      })
      .addCase(fetchSupplierLedger.rejected, (state, action) => {
        const key = action.meta.arg.id;
        const entry = state.bySupplierKey[key] ?? initialValueState<SupplierLedger>();
        entry.status = "failed";
        entry.error = String(action.payload ?? action.error.message);
        state.bySupplierKey[key] = entry;
      });
  },
});

export default ledgerSlice.reducer;
