export interface RateLimitOptions {
  interval: number; // Time window in ms
  uniqueTokenPerInterval: number; // Max users to track before clearing cache
}

/**
 * A simple in-memory rate limiter.
 * Note: In a serverless/distributed environment, this will be per-instance.
 * For global rate limiting, consider using Redis.
 */
const rateLimit = (options: RateLimitOptions) => {
  const tokenCache = new Map<string, [number, number]>();

  return {
    /**
     * Check if a token has exceeded the limit.
     * @param limit - Maximum requests allowed per interval
     * @param token - Unique identifier (e.g., IP address)
     * @returns boolean - true if allowed, false if limited
     */
    check: (limit: number, token: string) => {
      const now = Date.now();
      
      // Basic memory management: clear cache if it grows too large
      if (tokenCache.size > options.uniqueTokenPerInterval) {
        tokenCache.clear();
      }

      const tokenData = tokenCache.get(token);
      
      if (!tokenData) {
        tokenCache.set(token, [1, now]);
        return true;
      }

      const [count, lastTime] = tokenData;
      
      // If the interval has passed, reset the count
      if (now - lastTime > options.interval) {
        tokenCache.set(token, [1, now]);
        return true;
      }

      // If over the limit, reject
      if (count >= limit) {
        return false;
      }

      // Increment count
      tokenCache.set(token, [count + 1, lastTime]);
      return true;
    },
  };
};

// Default limiter: 100 requests per minute per IP
export const limiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
});
