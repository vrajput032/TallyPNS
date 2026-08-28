import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { DashboardSummary } from "@/features/dashboard/useDashboardSummary";
import type { MonthlySalesPoint } from "@/features/dashboard/useMonthlySales";
import type { CustomerSalesPoint } from "@/features/dashboard/useSalesByCustomer";
import { api } from "@/lib/api";
import {
  apiErrorMessage,
  initialValueState,
  listPending,
  type ValueState,
} from "./helpers";

type FetchArgs = { silent?: boolean };

interface DashboardState {
  summary: ValueState<DashboardSummary>;
  monthlySales: ValueState<MonthlySalesPoint[]>;
  salesByCustomer: ValueState<CustomerSalesPoint[]>;
}

const initialState: DashboardState = {
  summary: initialValueState(),
  monthlySales: initialValueState(),
  salesByCustomer: initialValueState(),
};

export const fetchDashboardSummary = createAsyncThunk(
  "dashboard/fetchSummary",
  async (_args: FetchArgs | undefined, { rejectWithValue }) => {
    try {
      const { data } = await api.get<DashboardSummary>("/dashboard/summary");
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const fetchMonthlySales = createAsyncThunk(
  "dashboard/fetchMonthlySales",
  async (_args: FetchArgs | undefined, { rejectWithValue }) => {
    try {
      const { data } = await api.get<MonthlySalesPoint[]>("/dashboard/sales/monthly");
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const fetchSalesByCustomer = createAsyncThunk(
  "dashboard/fetchSalesByCustomer",
  async (_args: FetchArgs | undefined, { rejectWithValue }) => {
    try {
      const { data } = await api.get<CustomerSalesPoint[]>("/dashboard/sales/by-customer");
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardSummary.pending, (state, action) => {
        state.summary.status = listPending(
          state.summary.status,
          state.summary.value != null,
          action.meta.arg?.silent
        );
        state.summary.error = null;
      })
      .addCase(fetchDashboardSummary.fulfilled, (state, action) => {
        state.summary = { value: action.payload, status: "succeeded", error: null };
      })
      .addCase(fetchDashboardSummary.rejected, (state, action) => {
        state.summary.status = "failed";
        state.summary.error = String(action.payload ?? action.error.message);
      })
      .addCase(fetchMonthlySales.pending, (state, action) => {
        state.monthlySales.status = listPending(
          state.monthlySales.status,
          state.monthlySales.value != null,
          action.meta.arg?.silent
        );
        state.monthlySales.error = null;
      })
      .addCase(fetchMonthlySales.fulfilled, (state, action) => {
        state.monthlySales = { value: action.payload, status: "succeeded", error: null };
      })
      .addCase(fetchMonthlySales.rejected, (state, action) => {
        state.monthlySales.status = "failed";
        state.monthlySales.error = String(action.payload ?? action.error.message);
      })
      .addCase(fetchSalesByCustomer.pending, (state, action) => {
        state.salesByCustomer.status = listPending(
          state.salesByCustomer.status,
          state.salesByCustomer.value != null,
          action.meta.arg?.silent
        );
        state.salesByCustomer.error = null;
      })
      .addCase(fetchSalesByCustomer.fulfilled, (state, action) => {
        state.salesByCustomer = { value: action.payload, status: "succeeded", error: null };
      })
      .addCase(fetchSalesByCustomer.rejected, (state, action) => {
        state.salesByCustomer.status = "failed";
        state.salesByCustomer.error = String(action.payload ?? action.error.message);
      });
  },
});

export default dashboardSlice.reducer;
