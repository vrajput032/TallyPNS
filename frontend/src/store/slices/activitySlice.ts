import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { ActivityLog } from "@/features/activity/types";
import { api } from "@/lib/api";
import { apiErrorMessage, initialListState, listPending } from "./helpers";

type FetchArgs = { silent?: boolean };

export const fetchActivity = createAsyncThunk(
  "activity/fetch",
  async (_args: FetchArgs | undefined, { rejectWithValue }) => {
    try {
      const { data } = await api.get<ActivityLog[]>("/activity");
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

const activitySlice = createSlice({
  name: "activity",
  initialState: initialListState<ActivityLog>(),
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchActivity.pending, (state, action) => {
        state.status = listPending(state.status, state.items.length > 0, action.meta.arg?.silent);
        state.error = null;
      })
      .addCase(fetchActivity.fulfilled, (state, action) => {
        state.items = action.payload;
        state.status = "succeeded";
      })
      .addCase(fetchActivity.rejected, (state, action) => {
        state.status = "failed";
        state.error = String(action.payload ?? action.error.message);
      });
  },
});

export default activitySlice.reducer;
