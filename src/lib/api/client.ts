import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { API_CLIENT_TIMEOUT_MS, BFF_BASE_PATH, isMockMode } from "@/lib/api/config";
import { parseApiError, type ParsedApiError } from "@/lib/api/errors";
import { clearAccessToken, getAccessToken, hasSession, setAccessToken } from "@/lib/auth/session";

export type ApiError = ParsedApiError;

export type Paginated<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
};

export const api = axios.create({
  baseURL: BFF_BASE_PATH,
  headers: { Accept: "application/json" },
  withCredentials: true,
  timeout: API_CLIENT_TIMEOUT_MS,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (!config.headers.get("X-Request-ID")) {
    config.headers.set("X-Request-ID", crypto.randomUUID());
  }
  if (isMockMode()) {
    const token = getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    config.headers.delete("Content-Type");
  } else if (!config.headers.get("Content-Type") && config.data !== undefined && config.method !== "get") {
    config.headers.set("Content-Type", "application/json");
  }
  return config;
});

let refreshing: Promise<boolean> | null = null;

async function refreshSession() {
  try {
    const { data } = await axios.post(
      `${BFF_BASE_PATH}/v1/auth/refresh`,
      {},
      {
        withCredentials: true,
        headers: { "Content-Type": "application/json" },
        timeout: API_CLIENT_TIMEOUT_MS,
      },
    );
    if (isMockMode() && data?.access_token) {
      setAccessToken(data.access_token);
    }
    return true;
  } catch {
    clearAccessToken();
    return false;
  }
}

function isPublicAuthPage() {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname;
  return path.startsWith("/login") || path.startsWith("/signup");
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const parsed = parseApiError(error.response?.status || 0, error.response?.data);
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const skipRefresh = isPublicAuthPage() || Boolean(original?.url?.includes("/v1/auth/"));
    if (parsed.status === 401 && original && !original._retry && !skipRefresh) {
      original._retry = true;
      refreshing = refreshing ?? refreshSession();
      const ok = await refreshing;
      refreshing = null;
      if (ok) return api(original);
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(Object.assign(error, { apiError: parsed }));
  },
);

export function getApiError(error: unknown): ParsedApiError {
  if (error && typeof error === "object" && "apiError" in error) {
    return (error as { apiError: ParsedApiError }).apiError;
  }
  if (axios.isAxiosError(error)) {
    return parseApiError(error.response?.status || 0, error.response?.data);
  }
  if (error instanceof Error) {
    return parseApiError(0, { error: { code: "UNKNOWN", message: error.message } });
  }
  return parseApiError(0, { error: { code: "UNKNOWN", message: "Erro inesperado." } });
}

export { hasSession };
