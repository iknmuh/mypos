import { NextRequest, NextResponse } from "next/server";
import { apiRoute, getStoreId } from "@/lib/api";
import { successResponse } from "@/lib/errors";
import { CreateProdukSchema, ProdukQuerySchema } from "@/lib/validations/produk";
import {
    getProdukList,
    createProduk,
    getLowStockProducts
} from "@/lib/services/produk.service";
import { AuditService, AuditTables } from "@/lib/audit";
import { CacheService, CacheKeys, CacheTTL, CacheInvalidation } from "@/lib/cache";
import { checkRateLimit } from "@/lib/rate-limit";
import { ValidationError } from "@/lib/errors";

/**
 * GET /api/produk - Get product list with pagination
 */
export async function GET(req: NextRequest) {
    return apiRoute(async () => {
        // Check rate limit
        const rateLimitResponse = await checkRateLimit(req);
        if (rateLimitResponse) return rateLimitResponse;

        const storeId = await getStoreId();
        const { searchParams } = req.nextUrl;

        // Check for low stock request
        const lowStock = searchParams.get("low_stock");
        if (lowStock === "true") {
            const products = await getLowStockProducts(storeId);
            return successResponse(products);
        }

        // Parse and validate query parameters
        const queryResult = ProdukQuerySchema.safeParse({
            search: searchParams.get("search") ?? undefined,
            kategori: searchParams.get("kategori") ?? undefined,
            kategori_id: searchParams.get("kategori_id") ?? undefined,
            aktif: searchParams.get("aktif") ?? undefined,
            page: searchParams.get("page") ?? "1",
            limit: searchParams.get("limit") ?? "50",
        });

        if (!queryResult.success) {
            throw new ValidationError("Parameter query tidak valid", {
                errors: queryResult.error.issues,
            });
        }

        const query = queryResult.data;

        // Try cache for first page without filters
        if (query.page === 1 && !query.search && !query.kategori && !query.kategori_id) {
            const cacheKey = CacheKeys.products(storeId);
            const cached = await CacheService.get(cacheKey);
            if (cached) {
                return NextResponse.json(cached);
            }
        }

        // Fetch from database
        const result = await getProdukList(storeId, {
            search: query.search,
            kategori: query.kategori,
            kategori_id: query.kategori_id,
            aktif: query.aktif,
            page: query.page,
            limit: query.limit,
        });

        // Cache first page results
        if (query.page === 1 && !query.search && !query.kategori && !query.kategori_id) {
            await CacheService.set(
                CacheKeys.products(storeId),
                result,
                CacheTTL.MEDIUM
            );
        }

        return NextResponse.json(result);
    });
}

/**
 * POST /api/produk - Create a new product
 */
export async function POST(req: NextRequest) {
    return apiRoute(async () => {
        // Check rate limit
        const rateLimitResponse = await checkRateLimit(req);
        if (rateLimitResponse) return rateLimitResponse;

        const storeId = await getStoreId();
        const body = await req.json();

        // Validate input
        const validationResult = CreateProdukSchema.safeParse(body);
        if (!validationResult.success) {
            throw new ValidationError("Data produk tidak valid", {
                errors: validationResult.error.issues,
            });
        }

        const input = validationResult.data;

        // Create product
        const product = await createProduk(storeId, input);

        // Invalidate cache
        await CacheInvalidation.product(storeId, product.id);

        // Log audit trail
        await AuditService.logCreate(
            AuditTables.PRODUK,
            product.id,
            {
                nama: product.nama,
                kode: product.kode,
                harga_jual: product.harga_jual,
                stok: product.stok,
            }
        );

        return successResponse(product, 201);
    });
}
