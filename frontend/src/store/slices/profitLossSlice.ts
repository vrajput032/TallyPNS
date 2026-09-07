import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { MonthPnl, PnlSummary } from "@/features/profit-loss/types";
import { api } from "@/lib/api";
import { apiErrorMessage, initialValueState, listPending, type ValueState } from "./helpers";

type MonthArgs = { month: number; year: number; silent?: boolean };
type SummaryArgs = { silent?: boolean };

interface ProfitLossState {
  byPeriod: Record<string, ValueState<MonthPnl>>;
  summary: ValueState<PnlSummary>;
}

const initialState: ProfitLossState = {
  byPeriod: {},
  summary: initialValueState<PnlSummary>(),
};

export function pnlPeriodKey(month: number, year: number) {
  return `${year}-${month}`;
}

export const fetchMonthProfitLoss = createAsyncThunk(
  "profitLoss/fetchMonth",
  async ({ month, year }: MonthArgs, { rejectWithValue }) => {
    try {
      const { data } = await api.get<MonthPnl>("/profit-loss", {
        params: { month, year },
      });
      return { key: pnlPeriodKey(month, year), data };
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const fetchPnlSummary = createAsyncThunk(
  "profitLoss/fetchSummary",
  async (_args: SummaryArgs | undefined, { rejectWithValue }) => {
    try {
      const { data } = await api.get<PnlSummary>("/profit-loss/summary");
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

const profitLossSlice = createSlice({
  name: "profitLoss",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMonthProfitLoss.pending, (state, action) => {
        const key = pnlPeriodKey(action.meta.arg.month, action.meta.arg.year);
        const entry = state.byPeriod[key] ?? initialValueState<MonthPnl>();
        entry.status = listPending(entry.status, entry.value != null, action.meta.arg.silent);
        entry.error = null;
        state.byPeriod[key] = entry;
      })
      .addCase(fetchMonthProfitLoss.fulfilled, (state, action) => {
        state.byPeriod[action.payload.key] = {
          value: action.payload.data,
          status: "succeeded",
          error: null,
        };
      })
      .addCase(fetchMonthProfitLoss.rejected, (state, action) => {
        const key = pnlPeriodKey(action.meta.arg.month, action.meta.arg.year);
        const entry = state.byPeriod[key] ?? initialValueState<MonthPnl>();
        entry.status = "failed";
        entry.error = String(action.payload ?? action.error.message);
        state.byPeriod[key] = entry;
      })
      .addCase(fetchPnlSummary.pending, (state, action) => {
        state.summary.status = listPending(
          state.summary.status,
          state.summary.value != null,
          action.meta.arg?.silent
        );
        state.summary.error = null;
      })
      .addCase(fetchPnlSummary.fulfilled, (state, action) => {
        state.summary = {
          value: action.payload,
          status: "succeeded",
          error: null,
        };
      })
      .addCase(fetchPnlSummary.rejected, (state, action) => {
        state.summary.status = "failed";
        state.summary.error = String(action.payload ?? action.error.message);
      });
  },
});

export default profitLossSlice.reducer;
