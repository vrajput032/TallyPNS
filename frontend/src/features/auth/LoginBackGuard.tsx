import { useEffect, useLayoutEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

/** Keep /login out of the back stack while signed in (blocks swipe-back to the login screen). */
export function LoginBackGuard() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const navigate = useNavigate();
  const location = useLocation();

  useLayoutEffect(() => {
    if (accessToken && location.pathname === "/login") {
      navigate("/", { replace: true });
    }
  }, [accessToken, location.pathname, navigate]);

  useEffect(() => {
    if (!accessToken) return;

    const onPopState = () => {
      if (window.location.pathname === "/login") {
        navigate("/", { replace: true });
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [accessToken, navigate]);

  return null;
}
