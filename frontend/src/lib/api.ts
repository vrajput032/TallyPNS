import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/authStore";
import { markApiSuccess, registerColdStartRequest } from "@/store/coldStartStore";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";

const apiBaseUrl = getApiBaseUrl();

type ApiRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _releaseColdStart?: () => void;
};

export const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  },
});

function releaseColdStart(config: InternalAxiosRequestConfig | undefined) {
  const release = (config as ApiRequestConfig | undefined)?._releaseColdStart;
  release?.();
}

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const release = registerColdStartRequest();
  (config as ApiRequestConfig)._releaseColdStart = release;
  return config;
});

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  const { data } = await axios.post(`${apiBaseUrl}/auth/refresh`, {
    refreshToken,
  });

  useAuthStore.getState().setTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

api.interceptors.response.use(
  (response) => {
    releaseColdStart(response.config);
    markApiSuccess();
    return response;
  },
  async (error: AxiosError) => {
    releaseColdStart(error.config);

    const originalRequest = error.config as ApiRequestConfig | undefined;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      const requestUrl = originalRequest.url ?? "";
      if (requestUrl.includes("/auth/login") || requestUrl.includes("/auth/refresh")) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      try {
        refreshPromise ??= refreshAccessToken();
        const accessToken = await refreshPromise;
        refreshPromise = null;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch {
        refreshPromise = null;
        useAuthStore.getState().logout();
      }
    }

    return Promise.reject(error);
  }
);
