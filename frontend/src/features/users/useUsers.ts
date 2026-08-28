import { useListQuery, useAsyncMutation } from "@/store/hooks/useReduxData";
import type { AppUser, UserRole } from "@/features/users/types";
import { createUser, deleteUser, fetchUsers } from "@/store/slices/usersSlice";

export function useUsers() {
  return useListQuery<AppUser>((s) => s.users, fetchUsers);
}

export function useCreateUser() {
  return useAsyncMutation<
    { username: string; password: string; name: string; role: UserRole },
    AppUser
  >(createUser);
}

export function useDeleteUser() {
  return useAsyncMutation<string, string>(deleteUser);
}
