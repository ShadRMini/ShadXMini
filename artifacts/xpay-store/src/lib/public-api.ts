import { apiFetch, clearApiCache, buildApiUrl } from "./api-client";

const TOKEN_KEY = "xpay_store_auth_token";

export async function getPublicJson<T>(path: string): Promise<T> {
  return apiFetch<T>(path);
}

export async function apiRequest<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const url = buildApiUrl(path);

  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `api_error_${response.status}`);
  }

  // If modifying data (POST, PUT, DELETE, PATCH), invalidate cached GET requests
  const method = (options.method || "GET").toUpperCase();
  if (method !== "GET") {
    clearApiCache();
  }

  return response.json() as Promise<T>;
}

