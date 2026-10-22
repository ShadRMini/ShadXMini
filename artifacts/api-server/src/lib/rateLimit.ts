import type { RequestHandler } from "express";

type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyPrefix: string;
  message?: string;
  keyGenerator?: (req: Parameters<RequestHandler>[0]) => string;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 60_000).unref();

function clientIp(req: Parameters<RequestHandler>[0]): string {
  // Task #95 C15a: use req.ip (trust proxy is configured in app.ts)
  // NEVER trust X-Forwarded-For[0] directly — it's attacker-controlled
  return req.ip || "unknown";
}

export function rateLimit(options: RateLimitOptions): RequestHandler {
  return (req, res, next) => {
    const now = Date.now();
    const identity = options.keyGenerator?.(req) || clientIp(req);
    const key = `${options.keyPrefix}:${identity}`;
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    current.count += 1;
    if (current.count > options.max) {
      console.warn(`[RateLimit] ⚠️ Limit exceeded for key: ${key} (${current.count}/${options.max})`);
      const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.status(429).json({
        error: options.message || "تم تجاوز عدد المحاولات المسموح. حاول لاحقًا.",
        retryAfterSeconds,
      });
      return;
    }

    next();
  };
}
