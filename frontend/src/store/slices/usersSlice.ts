import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { AppUser, UserRole } from "@/features/users/types";
import { api } from "@/lib/api";
import { apiErrorMessage, initialListState, listPending } from "./helpers";

type FetchArgs = { silent?: boolean };

export const fetchUsers = createAsyncThunk(
  "users/fetch",
  async (_args: FetchArgs | undefined, { rejectWithValue }) => {
    try {
      const { data } = await api.get<AppUser[]>("/auth/users");
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const createUser = createAsyncThunk(
  "users/create",
  async (
    input: { username: string; password: string; name: string; role: UserRole },
    { rejectWithValue, dispatch }
  ) => {
    try {
      const { data } = await api.post<AppUser>("/auth/users", input);
      dispatch(fetchUsers({ silent: true }));
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const deleteUser = createAsyncThunk(
  "users/delete",
  async (id: string, { rejectWithValue, dispatch }) => {
    try {
      await api.delete(`/auth/users/${id}`);
      dispatch(fetchUsers({ silent: true }));
      return id;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

const usersSlice = createSlice({
  name: "users",
  initialState: initialListState<AppUser>(),
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state, action) => {
        state.status = listPending(state.status, state.items.length > 0, action.meta.arg?.silent);
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.items = action.payload;
        state.status = "succeeded";
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.status = "failed";
        state.error = String(action.payload ?? action.error.message);
      });
  },
});

export default usersSlice.reducer;
