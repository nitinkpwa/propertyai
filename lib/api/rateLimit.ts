import { NextRequest } from "next/server";

/**
 * Lightweight in-process fixed-window rate limiter.
 *
 * This protects cost-sensitive endpoints (OpenAI proxies) and spam-prone writes
 * from a single instance. For horizontally-scaled/serverless deployments a
 * shared store (e.g. Upstash Redis) should back this — see the production
 * readiness report. It is intentionally dependency-free and fail-open on
 * internal errors so it can never take down a legitimate request path.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastPrune = 0;

function prune(now: number) {
  if (now - lastPrune < 60_000) return;
  lastPrune = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  prune(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { ok: true, retryAfterSeconds: 0 };
}

/** Stable per-caller identity for rate limiting: user id when known, else IP. */
export function getRateLimitKey(req: NextRequest, userId?: string | null): string {
  if (userId) return `u:${userId}`;
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "anon";
  return `ip:${ip}`;
}
