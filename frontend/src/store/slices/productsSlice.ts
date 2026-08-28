import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { Product, ProductInput } from "@/features/products/types";
import { api } from "@/lib/api";
import { apiErrorMessage, initialListState, listPending, type ListState } from "./helpers";

type FetchArgs = { silent?: boolean };

export const fetchProducts = createAsyncThunk(
  "products/fetch",
  async (_args: FetchArgs | undefined, { rejectWithValue }) => {
    try {
      const { data } = await api.get<Product[]>("/products");
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const createProduct = createAsyncThunk(
  "products/create",
  async (input: ProductInput, { rejectWithValue, dispatch }) => {
    try {
      const { data } = await api.post<Product>("/products", input);
      dispatch(fetchProducts({ silent: true }));
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const updateProduct = createAsyncThunk(
  "products/update",
  async ({ id, input }: { id: string; input: ProductInput }, { rejectWithValue, dispatch }) => {
    try {
      const { data } = await api.put<Product>(`/products/${id}`, input);
      dispatch(fetchProducts({ silent: true }));
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const deleteProduct = createAsyncThunk(
  "products/delete",
  async (id: string, { rejectWithValue, dispatch }) => {
    try {
      await api.delete(`/products/${id}`);
      dispatch(fetchProducts({ silent: true }));
      return id;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

export const uploadProductImage = createAsyncThunk(
  "products/uploadImage",
  async ({ id, file }: { id: string; file: File }, { rejectWithValue, dispatch }) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post<Product>(`/products/${id}/image`, formData);
      dispatch(fetchProducts({ silent: true }));
      return data;
    } catch (error) {
      return rejectWithValue(apiErrorMessage(error));
    }
  }
);

const productsSlice = createSlice({
  name: "products",
  initialState: initialListState<Product>(),
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state, action) => {
        state.status = listPending(state.status, state.items.length > 0, action.meta.arg?.silent);
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.items = action.payload;
        state.status = "succeeded";
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.status = "failed";
        state.error = String(action.payload ?? action.error.message);
      });
  },
});

export default productsSlice.reducer;
export type ProductsState = ListState<Product>;
