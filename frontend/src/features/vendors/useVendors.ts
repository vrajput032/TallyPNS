import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Vendor, VendorInput } from "./types";

const VENDORS_KEY = ["vendors"];

export function useVendors() {
  return useQuery({
    queryKey: VENDORS_KEY,
    queryFn: async () => {
      const { data } = await api.get<Vendor[]>("/vendors");
      return data;
    },
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: VendorInput) => {
      const { data } = await api.post<Vendor>("/vendors", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VENDORS_KEY });
    },
  });
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: VendorInput }) => {
      const { data } = await api.put<Vendor>(`/vendors/${id}`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VENDORS_KEY });
    },
  });
}

export function useDeleteVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/vendors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VENDORS_KEY });
    },
  });
}
