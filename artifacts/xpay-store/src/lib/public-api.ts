const TOKEN_KEY = "xpay_store_auth_token";

export async function getPublicJson<T>(path: string): Promise<T> {
  const baseUrl = String(import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
  const cleanPath = path.startsWith("/api/") ? path.slice(4) : path.startsWith("/api") && !path.startsWith("/api-") ? path.slice(4) : path;
  const normalizedPath = cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;
  const separator = normalizedPath.includes("?") ? "&" : "?";
  const url = `${baseUrl}/api${normalizedPath}${separator}_=${Date.now()}`;

  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers,
  });

  if (!response.ok) {
    throw new Error(`public_api_${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function apiRequest<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = String(import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
  const cleanPath = path.startsWith("/api/") ? path.slice(4) : path.startsWith("/api") && !path.startsWith("/api-") ? path.slice(4) : path;
  const normalizedPath = cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;
  const separator = normalizedPath.includes("?") ? "&" : "?";
  const url = `${baseUrl}/api${normalizedPath}${separator}_=${Date.now()}`;

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
    headers,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `api_error_${response.status}`);
  }

  return response.json() as Promise<T>;
}
