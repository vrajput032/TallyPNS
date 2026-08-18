import { Navigate, Outlet } from "react-router-dom";
import { canDelete } from "@/lib/permissions";
import { useAuthStore } from "@/store/authStore";

export function AdminRoute() {
  const user = useAuthStore((state) => state.user);

  if (!canDelete(user)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
