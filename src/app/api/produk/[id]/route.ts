import { NextRequest, NextResponse } from "next/server";
import { apiRouteWithParams, getStoreId } from "@/lib/api";
import { successResponse } from "@/lib/errors";
import { UpdateProdukSchema } from "@/lib/validations/produk";
import {
    getProdukById,
    updateProduk,
    deleteProduk
} from "@/lib/services/produk.service";
import { AuditService, AuditTables } from "@/lib/audit";
import { CacheInvalidation, CacheService, CacheKeys, CacheTTL } from "@/lib/cache";
import { checkRateLimit } from "@/lib/rate-limit";
import { ValidationError } from "@/lib/errors";

type Params = { id: string };

/**
 * GET /api/produk/[id] - Get product by ID
 */
export async function GET(
    req: NextRequest,
    context: { params: Promise<Params> }
) {
    return apiRouteWithParams(async (req, params) => {
        // Check rate limit
        const rateLimitResponse = await checkRateLimit(req);
        if (rateLimitResponse) return rateLimitResponse;

        const storeId = await getStoreId();
        const { id } = params;

        // Try cache first
        const cacheKey = CacheKeys.product(id);
        const cached = await CacheService.get(cacheKey);
        if (cached) {
            return successResponse(cached);
        }

        // Fetch from database
        const product = await getProdukById(id, storeId);

        // Cache the result
        await CacheService.set(cacheKey, product, CacheTTL.MEDIUM);

        return successResponse(product);
    })(req, context);
}

/**
 * PUT /api/produk/[id] - Update product
 */
export async function PUT(
    req: NextRequest,
    context: { params: Promise<Params> }
) {
    return apiRouteWithParams(async (req, params) => {
        // Check rate limit
        const rateLimitResponse = await checkRateLimit(req);
        if (rateLimitResponse) return rateLimitResponse;

        const storeId = await getStoreId();
        const { id } = params;
        const body = await req.json();

        // Validate input
        const validationResult = UpdateProdukSchema.safeParse(body);
        if (!validationResult.success) {
            throw new ValidationError("Data produk tidak valid", {
                errors: validationResult.error.issues,
            });
        }

        const input = validationResult.data;

        // Get current product for audit log
        const currentProduct = await getProdukById(id, storeId);

        // Update product
        const updatedProduct = await updateProduk(id, storeId, input);

        // Invalidate cache
        await CacheInvalidation.product(storeId, id);

        // Log audit trail
        await AuditService.logUpdate(
            AuditTables.PRODUK,
            id,
            {
                nama: currentProduct.nama,
                harga_jual: currentProduct.harga_jual,
                stok: currentProduct.stok,
            },
            {
                nama: updatedProduct.nama,
                harga_jual: updatedProduct.harga_jual,
                stok: updatedProduct.stok,
            }
        );

        return successResponse(updatedProduct);
    })(req, context);
}

/**
 * DELETE /api/produk/[id] - Soft delete product
 */
export async function DELETE(
    req: NextRequest,
    context: { params: Promise<Params> }
) {
    return apiRouteWithParams(async (req, params) => {
        // Check rate limit
        const rateLimitResponse = await checkRateLimit(req);
        if (rateLimitResponse) return rateLimitResponse;

        const storeId = await getStoreId();
        const { id } = params;

        // Get current product for audit log
        const currentProduct = await getProdukById(id, storeId);

        // Soft delete product
        await deleteProduk(id, storeId);

        // Invalidate cache
        await CacheInvalidation.product(storeId, id);

        // Log audit trail
        await AuditService.logDelete(
            AuditTables.PRODUK,
            id,
            {
                nama: currentProduct.nama,
                kode: currentProduct.kode,
            }
        );

        return successResponse({ success: true });
    })(req, context);
}
