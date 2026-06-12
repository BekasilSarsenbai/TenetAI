import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let limiter: Ratelimit | null = null;

function getLimiter(): Ratelimit | null {
  if (limiter) return limiter;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  limiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(5, "10 m"),
    prefix: "waitlist",
    analytics: false,
  });
  return limiter;
}

/** Returns true if the request is allowed. No-op (allow) when Upstash is not configured. */
export async function allowRequest(ip: string): Promise<boolean> {
  const l = getLimiter();
  if (!l) return true;
  const { success } = await l.limit(ip);
  return success;
}
