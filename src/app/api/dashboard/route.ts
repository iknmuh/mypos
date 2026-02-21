import { NextRequest, NextResponse } from "next/server";
import { apiRoute, getStoreId } from "@/lib/api";
import { successResponse } from "@/lib/errors";
import { getDashboardStats, getDashboardStatsAtomic } from "@/lib/services/dashboard.service";
import { CacheService, CacheKeys, CacheTTL } from "@/lib/cache";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * GET /api/dashboard - Get dashboard statistics
 * Uses caching to reduce database load
 */
export async function GET(req: NextRequest) {
    return apiRoute(async () => {
        // Check rate limit
        const rateLimitResponse = await checkRateLimit(req);
        if (rateLimitResponse) return rateLimitResponse;

        const storeId = await getStoreId();
        const cacheKey = CacheKeys.dashboard(storeId);

        // Try to get from cache first (60 second TTL for dashboard)
        const cachedStats = await CacheService.get(cacheKey);
        if (cachedStats) {
            return successResponse(cachedStats);
        }

        // Try to use atomic RPC function first
        let stats;
        try {
            stats = await getDashboardStatsAtomic(storeId);
        } catch {
            // Fallback to individual queries if RPC fails
            stats = await getDashboardStats(storeId);
        }

        // Cache the results
        await CacheService.set(cacheKey, stats, CacheTTL.SHORT);

        return successResponse(stats);
    });
}
