import { useListQuery, useAsyncMutation } from "@/store/hooks/useReduxData";
import type { Product, ProductInput } from "@/features/products/types";
import {
  createProduct,
  deleteProduct,
  fetchProducts,
  updateProduct,
  uploadProductImage,
} from "@/store/slices/productsSlice";

export function useProducts() {
  return useListQuery<Product>((s) => s.products, fetchProducts);
}

export function useCreateProduct() {
  return useAsyncMutation<ProductInput, Product>(createProduct);
}

export function useUpdateProduct() {
  return useAsyncMutation<{ id: string; input: ProductInput }, Product>(updateProduct);
}

export function useDeleteProduct() {
  return useAsyncMutation<string, string>(deleteProduct);
}

export function useUploadProductImage() {
  return useAsyncMutation<{ id: string; file: File }, Product>(uploadProductImage);
}
