import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";
import { RateLimitedError, ApiResponse, ErrorCode } from "./errors";

// Initialize Redis client
let redis: Redis | null = null;
let rateLimiter: Ratelimit | null = null;

/**
 * Initialize Redis connection
 * Returns null if credentials are not configured
 */
function getRedisClient(): Redis | null {
    if (redis) return redis;

    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
        console.warn("[Rate Limit] Upstash Redis credentials not configured. Rate limiting is disabled.");
        return null;
    }

    redis = new Redis({ url, token });
    return redis;
}

/**
 * Initialize rate limiter
 * Returns null if Redis is not configured
 */
function getRateLimiter(): Ratelimit | null {
    if (rateLimiter) return rateLimiter;

    const client = getRedisClient();
    if (!client) return null;

    rateLimiter = new Ratelimit({
        redis: client,
        limiter: Ratelimit.slidingWindow(100, "1 m"), // 100 requests per minute
        analytics: true,
        prefix: "mypos-api",
    });

    return rateLimiter;
}

/**
 * Rate limit configuration for different endpoint types
 */
export const RateLimitConfig = {
    // Default: 100 requests per minute
    default: { limit: 100, window: "1 m" as const },

    // Auth endpoints: 10 requests per minute (stricter)
    auth: { limit: 10, window: "1 m" as const },

    // Read endpoints: 200 requests per minute (more lenient)
    read: { limit: 200, window: "1 m" as const },

    // Write endpoints: 50 requests per minute
    write: { limit: 50, window: "1 m" as const },

    // AI endpoints: 20 requests per minute (expensive)
    ai: { limit: 20, window: "1 m" as const },
};

/**
 * Create a rate limiter with custom config
 */
export function createRateLimiter(config: { limit: number; window: "1 m" | "1 h" | "1 d" }) {
    const client = getRedisClient();
    if (!client) return null;

    return new Ratelimit({
        redis: client,
        limiter: Ratelimit.slidingWindow(config.limit, config.window),
        analytics: true,
        prefix: "mypos-api-custom",
    });
}

/**
 * Get client identifier from request
 */
function getClientIdentifier(req: NextRequest): string {
    // Try to get user ID from auth header
    const authHeader = req.headers.get("authorization");
    if (authHeader) {
        // Extract user ID from header if available
        return `user:${authHeader.slice(0, 50)}`;
    }

    // Fall back to IP address
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "anonymous";

    return `ip:${ip}`;
}

/**
 * Check rate limit for a request
 * Returns null if rate limiting is disabled or request is allowed
 * Returns Response if rate limit is exceeded
 */
export async function checkRateLimit(
    req: NextRequest,
    config: { limit: number; window: "1 m" | "1 h" | "1 d" } = RateLimitConfig.default
): Promise<NextResponse<ApiResponse> | null> {
    const limiter = getRateLimiter();

    // If rate limiting is disabled, allow all requests
    if (!limiter) return null;

    const identifier = getClientIdentifier(req);

    try {
        const { success, limit, reset, remaining } = await limiter.limit(identifier);

        if (!success) {
            const retryAfter = Math.ceil((reset - Date.now()) / 1000);

            return NextResponse.json<ApiResponse>(
                {
                    success: false,
                    error: "Terlalu banyak permintaan. Coba lagi nanti.",
                    code: ErrorCode.RATE_LIMITED,
                    details: { retryAfter, limit },
                },
                {
                    status: 429,
                    headers: {
                        "X-RateLimit-Limit": limit.toString(),
                        "X-RateLimit-Remaining": remaining.toString(),
                        "X-RateLimit-Reset": reset.toString(),
                        "Retry-After": retryAfter.toString(),
                    },
                }
            );
        }

        // Request is allowed, return null
        return null;
    } catch (error) {
        // If rate limiter fails, log and allow the request
        console.error("[Rate Limit] Error checking rate limit:", error);
        return null;
    }
}

/**
 * Higher-order function to wrap API handlers with rate limiting
 */
export function withRateLimit(
    config: { limit: number; window: "1 m" | "1 h" | "1 d" } = RateLimitConfig.default
) {
    return function <T extends unknown[]>(
        handler: (req: NextRequest, ...args: T) => Promise<NextResponse>
    ) {
        return async (req: NextRequest, ...args: T): Promise<NextResponse> => {
            const rateLimitResponse = await checkRateLimit(req, config);
            if (rateLimitResponse) return rateLimitResponse;

            return handler(req, ...args);
        };
    };
}

/**
 * Rate limit middleware for specific endpoint types
 */
export const rateLimitMiddleware = {
    auth: withRateLimit(RateLimitConfig.auth),
    read: withRateLimit(RateLimitConfig.read),
    write: withRateLimit(RateLimitConfig.write),
    ai: withRateLimit(RateLimitConfig.ai),
    default: withRateLimit(RateLimitConfig.default),
};
