import { NextRequest, NextResponse } from "next/server";
import { apiRoute, getStoreId } from "@/lib/api";
import { successResponse } from "@/lib/errors";
import { getSalesReport, getProductReport, getFinancialReport } from "@/lib/services/dashboard.service";
import { CacheService, CacheKeys, CacheTTL } from "@/lib/cache";
import { checkRateLimit } from "@/lib/rate-limit";
import { ValidationError } from "@/lib/errors";

/**
 * GET /api/laporan - Get reports
 * Query params:
 * - tipe: penjualan | produk | keuangan
 * - from: start date (YYYY-MM-DD)
 * - to: end date (YYYY-MM-DD)
 */
export async function GET(req: NextRequest) {
    return apiRoute(async () => {
        // Check rate limit
        const rateLimitResponse = await checkRateLimit(req);
        if (rateLimitResponse) return rateLimitResponse;

        const storeId = await getStoreId();
        const { searchParams } = req.nextUrl;

        const tipe = searchParams.get("tipe") ?? "penjualan";
        const from = searchParams.get("from") ?? new Date(new Date().setDate(1)).toISOString().split("T")[0];
        const to = searchParams.get("to") ?? new Date().toISOString().split("T")[0];

        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(from) || !dateRegex.test(to)) {
            throw new ValidationError("Format tanggal tidak valid. Gunakan format YYYY-MM-DD");
        }

        // Try cache first
        let cacheKey: string;
        let fetchFn: () => Promise<unknown>;

        switch (tipe) {
            case "penjualan":
                cacheKey = CacheKeys.salesReport(storeId, from, to);
                fetchFn = async () => getSalesReport(storeId, from, to);
                break;

            case "produk":
                cacheKey = CacheKeys.productReport(storeId, from, to);
                fetchFn = async () => getProductReport(storeId, from, to);
                break;

            case "keuangan":
                cacheKey = CacheKeys.financialReport(storeId, from, to);
                fetchFn = async () => getFinancialReport(storeId, from, to);
                break;

            default:
                throw new ValidationError("Tipe laporan tidak valid. Gunakan: penjualan, produk, atau keuangan");
        }

        // Try cache
        const cached = await CacheService.get(cacheKey);
        if (cached) {
            return successResponse(cached);
        }

        // Fetch report
        const report = await fetchFn();

        // Cache the result (longer TTL for reports)
        await CacheService.set(cacheKey, report, CacheTTL.LONG);

        return successResponse(report);
    });
}
