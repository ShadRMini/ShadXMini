// In-flight request deduplication + cache
const inflightRequests = new Map<string, Promise<any>>();
const responseCache = new Map<string, { data: any; timestamp: number }>();
const DEFAULT_TTL = 30_000; // 30 seconds
const TOKEN_KEY = "xpay_store_auth_token";

export function apiBaseUrl(): string {
  return String(import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
}

export function buildApiUrl(path: string): string {
  const base = apiBaseUrl();
  const cleanPath = path.startsWith("/api/")
    ? path.slice(4)
    : path.startsWith("/api") && !path.startsWith("/api-")
    ? path.slice(4)
    : path;
  const normalizedPath = cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;
  return `${base}/api${normalizedPath}`;
}

export interface ApiFetchOptions {
  ttl?: number;
  skipCache?: boolean;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export async function apiFetch<T = any>(
  url: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { ttl = DEFAULT_TTL, skipCache = false, headers: customHeaders, signal } = options;

  const finalUrl = url.startsWith("http://") || url.startsWith("https://") ? url : buildApiUrl(url);

  // Generate canonical cache key without cache-busting timestamp `_=`
  let cacheKey = finalUrl;
  try {
    const urlObj = new URL(finalUrl, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    urlObj.searchParams.delete("_");
    cacheKey = urlObj.pathname + urlObj.search;
  } catch {
    cacheKey = finalUrl.replace(/[?&]_=\d+/, "");
  }

  // 1. Cache hit?
  if (!skipCache) {
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data as T;
    }
  }

  // 2. In-flight dedup?
  if (inflightRequests.has(cacheKey)) {
    return inflightRequests.get(cacheKey) as Promise<T>;
  }

  // 3. Fresh request
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem(TOKEN_KEY) || localStorage.getItem("token")
      : null;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(customHeaders || {}),
  };

  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const promise = fetch(finalUrl, {
    method: "GET",
    credentials: "include",
    headers,
    signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`API ${res.status}: ${url}`);
      }
      const data = await res.json();
      responseCache.set(cacheKey, { data, timestamp: Date.now() });
      return data as T;
    })
    .finally(() => {
      inflightRequests.delete(cacheKey);
    });

  inflightRequests.set(cacheKey, promise);
  return promise;
}

export function clearApiCache(pathPrefix?: string) {
  if (!pathPrefix) {
    responseCache.clear();
    inflightRequests.clear();
    return;
  }
  for (const key of responseCache.keys()) {
    if (key.includes(pathPrefix)) {
      responseCache.delete(key);
    }
  }
  for (const key of inflightRequests.keys()) {
    if (key.includes(pathPrefix)) {
      inflightRequests.delete(key);
    }
  }
}
