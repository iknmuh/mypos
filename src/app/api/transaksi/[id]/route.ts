import { NextRequest, NextResponse } from "next/server";
import { apiRouteWithParams, getStoreId } from "@/lib/api";
import { successResponse } from "@/lib/errors";
import { UpdateTransaksiSchema } from "@/lib/validations/transaksi";
import { getTransaksiById, voidTransactionAtomic } from "@/lib/services/transaksi.service";
import { AuditService, AuditTables, extractRequestMetadata } from "@/lib/audit";
import { CacheInvalidation } from "@/lib/cache";
import { checkRateLimit } from "@/lib/rate-limit";
import { ValidationError, NotFoundError } from "@/lib/errors";

type Params = { id: string };

/**
 * GET /api/transaksi/[id] - Get transaction by ID
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

        const transaksi = await getTransaksiById(id, storeId);

        return successResponse(transaksi);
    })(req, context);
}

/**
 * PATCH /api/transaksi/[id] - Update transaction (mainly for voiding)
 */
export async function PATCH(
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
        const validationResult = UpdateTransaksiSchema.safeParse(body);
        if (!validationResult.success) {
            throw new ValidationError("Data tidak valid", {
                errors: validationResult.error.issues,
            });
        }

        const { status } = validationResult.data;

        // Only allow voiding transactions
        if (status === "dibatalkan") {
            // Get current transaction for audit log
            const currentTransaksi = await getTransaksiById(id, storeId);

            if (currentTransaksi.status === "dibatalkan") {
                throw new ValidationError("Transaksi sudah dibatalkan sebelumnya");
            }

            // Void transaction atomically
            const result = await voidTransactionAtomic(id, storeId, body.alasan);

            // Invalidate caches
            await CacheInvalidation.transaction(storeId, id);

            // Log audit trail
            const metadata = extractRequestMetadata(req);
            await AuditService.logVoid(
                AuditTables.TRANSAKSI,
                id,
                {
                    invoice_no: currentTransaksi.nomor,
                    grand_total: currentTransaksi.grand_total,
                    status: currentTransaksi.status,
                },
                body.alasan
            );

            return successResponse({
                id: result.transaksi_id,
                nomor: result.invoice_no,
                status: "dibatalkan",
            });
        }

        throw new ValidationError("Hanya pembatalan transaksi yang diizinkan");
    })(req, context);
}

/**
 * DELETE /api/transaksi/[id] - Void transaction (alias for PATCH with status=dibatalkan)
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

        // Get current transaction for audit log
        const currentTransaksi = await getTransaksiById(id, storeId);

        if (currentTransaksi.status === "dibatalkan") {
            throw new ValidationError("Transaksi sudah dibatalkan sebelumnya");
        }

        // Void transaction atomically
        const result = await voidTransactionAtomic(id, storeId);

        // Invalidate caches
        await CacheInvalidation.transaction(storeId, id);

        // Log audit trail
        await AuditService.logVoid(
            AuditTables.TRANSAKSI,
            id,
            {
                invoice_no: currentTransaksi.nomor,
                grand_total: currentTransaksi.grand_total,
                status: currentTransaksi.status,
            }
        );

        return successResponse({
            id: result.transaksi_id,
            nomor: result.invoice_no,
            status: "dibatalkan",
        });
    })(req, context);
}
