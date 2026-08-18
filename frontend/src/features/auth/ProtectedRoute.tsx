import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { AuthSplash } from "@/components/loading/AuthSplash";
import { useAuthStore } from "@/store/authStore";

export function ProtectedRoute() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [hydrated, setHydrated] = useState(() => useAuthStore.persist.hasHydrated());

  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useAuthStore.persist.hasHydrated());
    return unsub;
  }, []);

  if (!hydrated) {
    return <AuthSplash message="Loading your workspace..." />;
  }

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
