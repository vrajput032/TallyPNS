import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { MonthPnl, PnlSummary, ScrapGrade } from "@/features/profit-loss/types";
import { api } from "@/lib/api";
import { apiErrorMessage, initialValueState, listPending, type ValueState } from "./helpers";

type MonthArgs = { month: number; year: number; scrapGrade: ScrapGrade; silent?: boolean };
type SummaryArgs = { scrapGrade: ScrapGrade; silent?: boolean };

interface ProfitLossState {
  byPeriod: Record<string, ValueState<MonthPnl>>;
  summaryByGrade: Record<string, ValueState<PnlSummary>>;
}

const initialState: ProfitLossState = {
  byPeriod: {},
  summaryByGrade: {},
};

export function pnlPeriodKey(month: number, year: number, scrapGrade: ScrapGrade) {
  return `${year}-${month}-${scrapGrade}`;
}

export const fetchMonthProfitLoss = createAsyncThunk(
  "profitLoss/fetchMonth",
  async ({ month, year, scrapGrade }: MonthArgs, { rejectWithValue }) => {
    try {
      const { data } = await api.get<MonthPnl>("/profit-loss", {
        params: { month, year, scrapGrade },
      });
      return { key: pnlPeriodKey(month, year, scrapGrade), data };
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const fetchPnlSummary = createAsyncThunk(
  "profitLoss/fetchSummary",
  async ({ scrapGrade }: SummaryArgs, { rejectWithValue }) => {
    try {
      const { data } = await api.get<PnlSummary>("/profit-loss/summary", {
        params: { scrapGrade },
      });
      return { key: scrapGrade, data };
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
        const key = pnlPeriodKey(
          action.meta.arg.month,
          action.meta.arg.year,
          action.meta.arg.scrapGrade
        );
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
        const key = pnlPeriodKey(
          action.meta.arg.month,
          action.meta.arg.year,
          action.meta.arg.scrapGrade
        );
        const entry = state.byPeriod[key] ?? initialValueState<MonthPnl>();
        entry.status = "failed";
        entry.error = String(action.payload ?? action.error.message);
        state.byPeriod[key] = entry;
      })
      .addCase(fetchPnlSummary.pending, (state, action) => {
        const key = action.meta.arg.scrapGrade;
        const entry = state.summaryByGrade[key] ?? initialValueState<PnlSummary>();
        entry.status = listPending(entry.status, entry.value != null, action.meta.arg.silent);
        entry.error = null;
        state.summaryByGrade[key] = entry;
      })
      .addCase(fetchPnlSummary.fulfilled, (state, action) => {
        state.summaryByGrade[action.payload.key] = {
          value: action.payload.data,
          status: "succeeded",
          error: null,
        };
      })
      .addCase(fetchPnlSummary.rejected, (state, action) => {
        const key = action.meta.arg.scrapGrade;
        const entry = state.summaryByGrade[key] ?? initialValueState<PnlSummary>();
        entry.status = "failed";
        entry.error = String(action.payload ?? action.error.message);
        state.summaryByGrade[key] = entry;
      });
  },
});

export default profitLossSlice.reducer;
