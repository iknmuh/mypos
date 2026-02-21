import { NextRequest, NextResponse } from "next/server";
import { apiRoute, getStoreId } from "@/lib/api";
import { successResponse } from "@/lib/errors";
import { CreateTransaksiSchema, TransaksiQuerySchema } from "@/lib/validations/transaksi";
import { processSaleAtomic, getTransaksiList } from "@/lib/services/transaksi.service";
import { AuditService, AuditTables, extractRequestMetadata } from "@/lib/audit";
import { CacheService, CacheKeys, CacheTTL, CacheInvalidation } from "@/lib/cache";
import { checkRateLimit } from "@/lib/rate-limit";
import { ValidationError } from "@/lib/errors";

/**
 * GET /api/transaksi - Get transaction list with pagination
 */
export async function GET(req: NextRequest) {
    return apiRoute(async () => {
        // Check rate limit
        const rateLimitResponse = await checkRateLimit(req);
        if (rateLimitResponse) return rateLimitResponse;

        const storeId = await getStoreId();
        const { searchParams } = req.nextUrl;

        // Parse and validate query parameters
        const queryResult = TransaksiQuerySchema.safeParse({
            from: searchParams.get("from") ?? undefined,
            to: searchParams.get("to") ?? undefined,
            status: searchParams.get("status") ?? undefined,
            page: searchParams.get("page") ?? "1",
            limit: searchParams.get("limit") ?? "50",
        });

        if (!queryResult.success) {
            throw new ValidationError("Parameter query tidak valid", {
                errors: queryResult.error.issues
            });
        }

        const query = queryResult.data;

        // Try cache first for first page
        if (query.page === 1 && !query.from && !query.to && !query.status) {
            const cacheKey = CacheKeys.transactions(storeId, 1);
            const cached = await CacheService.get(cacheKey);
            if (cached) {
                return NextResponse.json(cached);
            }
        }

        // Fetch from database
        const result = await getTransaksiList(storeId, {
            from: query.from,
            to: query.to,
            status: query.status,
            page: query.page,
            limit: query.limit,
        });

        // Cache first page results
        if (query.page === 1 && !query.from && !query.to && !query.status) {
            await CacheService.set(
                CacheKeys.transactions(storeId, 1),
                result,
                CacheTTL.SHORT
            );
        }

        return NextResponse.json(result);
    });
}

/**
 * POST /api/transaksi - Create a new transaction
 */
export async function POST(req: NextRequest) {
    return apiRoute(async () => {
        // Check rate limit for write operations
        const rateLimitResponse = await checkRateLimit(req);
        if (rateLimitResponse) return rateLimitResponse;

        const storeId = await getStoreId();
        const body = await req.json();

        // Validate input
        const validationResult = CreateTransaksiSchema.safeParse(body);
        if (!validationResult.success) {
            throw new ValidationError("Data transaksi tidak valid", {
                errors: validationResult.error.issues,
            });
        }

        const input = validationResult.data;

        // Validate item subtotals
        const subtotalValidation = input.items.every(item => {
            const expected = (item.harga * item.jumlah) - item.diskon;
            return item.subtotal === expected;
        });

        if (!subtotalValidation) {
            throw new ValidationError("Subtotal item tidak sesuai");
        }

        // Process transaction atomically
        const result = await processSaleAtomic(storeId, input);

        // Invalidate relevant caches
        await CacheInvalidation.transaction(storeId, result.invoice_id);

        // Log audit trail
        const metadata = extractRequestMetadata(req);
        await AuditService.logCreate(
            AuditTables.TRANSAKSI,
            result.invoice_id,
            {
                invoice_no: result.invoice_no,
                grand_total: input.grand_total,
                metode: input.metode,
                items_count: input.items.length,
            }
        );

        return successResponse({
            id: result.invoice_id,
            nomor: result.invoice_no,
            total_items: result.total_items,
        }, 201);
    });
}
