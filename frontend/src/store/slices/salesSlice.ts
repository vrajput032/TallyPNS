import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { SalesInvoice, SalesInvoiceInput } from "@/features/sales/types";
import { api } from "@/lib/api";
import { fetchProducts } from "./productsSlice";
import { fetchDashboardSummary } from "./dashboardSlice";
import { fetchCustomerLedger, fetchLedgerList } from "./ledgerSlice";
import {
  apiErrorMessage,
  initialListState,
  initialValueState,
  listPending,
  type ListState,
  type ValueState,
} from "./helpers";

type FetchArgs = { silent?: boolean };

interface SalesState {
  list: ListState<SalesInvoice>;
  byId: Record<string, ValueState<SalesInvoice>>;
  nextInvoiceNo: ValueState<string>;
}

const initialState: SalesState = {
  list: initialListState(),
  byId: {},
  nextInvoiceNo: initialValueState(),
};

export const fetchSalesInvoices = createAsyncThunk(
  "sales/fetchList",
  async (_args: FetchArgs | undefined, { rejectWithValue }) => {
    try {
      const { data } = await api.get<SalesInvoice[]>("/sales");
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const fetchSalesInvoice = createAsyncThunk(
  "sales/fetchOne",
  async ({ id, silent }: { id: string; silent?: boolean }, { rejectWithValue }) => {
    try {
      const { data } = await api.get<SalesInvoice>(`/sales/${id}`);
      return { id, data, silent };
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const fetchNextInvoiceNo = createAsyncThunk(
  "sales/fetchNextNo",
  async (_void: void, { rejectWithValue }) => {
    try {
      const { data } = await api.get<{ invoiceNo: string }>("/sales/next-invoice-no");
      return data.invoiceNo;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const createSalesInvoice = createAsyncThunk(
  "sales/create",
  async (input: SalesInvoiceInput, { rejectWithValue, dispatch }) => {
    try {
      const { data } = await api.post<SalesInvoice>("/sales", input);
      dispatch(fetchSalesInvoices({ silent: true }));
      dispatch(fetchProducts({ silent: true }));
      dispatch(fetchDashboardSummary({ silent: true }));
      dispatch(fetchLedgerList({ silent: true }));
      dispatch(fetchCustomerLedger({ id: data.customerId, silent: true }));
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const updateSalesInvoice = createAsyncThunk(
  "sales/update",
  async (
    { id, pin, input }: { id: string; pin: string; input: SalesInvoiceInput },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const { data } = await api.put<SalesInvoice>(`/sales/${id}`, input, {
        headers: { "X-Delete-Pin": pin },
      });
      dispatch(fetchSalesInvoices({ silent: true }));
      dispatch(fetchProducts({ silent: true }));
      dispatch(fetchDashboardSummary({ silent: true }));
      dispatch(fetchLedgerList({ silent: true }));
      dispatch(fetchCustomerLedger({ id: data.customerId, silent: true }));
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const deleteSalesInvoice = createAsyncThunk(
  "sales/delete",
  async ({ id, pin }: { id: string; pin: string }, { rejectWithValue, dispatch }) => {
    try {
      await api.delete(`/sales/${id}`, { headers: { "X-Delete-Pin": pin } });
      dispatch(fetchSalesInvoices({ silent: true }));
      dispatch(fetchProducts({ silent: true }));
      dispatch(fetchDashboardSummary({ silent: true }));
      dispatch(fetchLedgerList({ silent: true }));
      return id;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

const salesSlice = createSlice({
  name: "sales",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSalesInvoices.pending, (state, action) => {
        state.list.status = listPending(
          state.list.status,
          state.list.items.length > 0,
          action.meta.arg?.silent
        );
        state.list.error = null;
      })
      .addCase(fetchSalesInvoices.fulfilled, (state, action) => {
        state.list.items = action.payload;
        state.list.status = "succeeded";
      })
      .addCase(fetchSalesInvoices.rejected, (state, action) => {
        state.list.status = "failed";
        state.list.error = String(action.payload ?? action.error.message);
      })
      .addCase(fetchSalesInvoice.pending, (state, action) => {
        const id = action.meta.arg.id;
        const entry = state.byId[id] ?? initialValueState<SalesInvoice>();
        entry.status = listPending(entry.status, entry.value != null, action.meta.arg.silent);
        entry.error = null;
        state.byId[id] = entry;
      })
      .addCase(
        fetchSalesInvoice.fulfilled,
        (state, action: PayloadAction<{ id: string; data: SalesInvoice }>) => {
          state.byId[action.payload.id] = {
            value: action.payload.data,
            status: "succeeded",
            error: null,
          };
        }
      )
      .addCase(fetchSalesInvoice.rejected, (state, action) => {
        const id = action.meta.arg.id;
        const entry = state.byId[id] ?? initialValueState<SalesInvoice>();
        entry.status = "failed";
        entry.error = String(action.payload ?? action.error.message);
        state.byId[id] = entry;
      })
      .addCase(fetchNextInvoiceNo.pending, (state) => {
        state.nextInvoiceNo.status = "loading";
      })
      .addCase(fetchNextInvoiceNo.fulfilled, (state, action) => {
        state.nextInvoiceNo = { value: action.payload, status: "succeeded", error: null };
      })
      .addCase(fetchNextInvoiceNo.rejected, (state, action) => {
        state.nextInvoiceNo.status = "failed";
        state.nextInvoiceNo.error = String(action.payload ?? action.error.message);
      });
  },
});

export default salesSlice.reducer;
