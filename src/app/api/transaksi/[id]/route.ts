import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStoreId, apiRouteWithParams } from "@/lib/api";

type Params = { id: string };

/**
 * GET /api/transaksi/[id] - Get transaction by ID with items
 */
export async function GET(
    req: NextRequest,
    context: { params: Promise<Params> }
) {
    return apiRouteWithParams(async (_req, params) => {
        const storeId = await getStoreId();
        const { id } = params;

        const { data, error } = await supabaseAdmin
            .from("transaksi")
            .select("*, transaksi_item(*)")
            .eq("id", id)
            .eq("store_id", storeId)
            .single();

        if (error) {
            return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
        }

        return NextResponse.json(data);
    })(req, context);
}

/**
 * PATCH /api/transaksi/[id] - Update transaction status (void)
 */
export async function PATCH(
    req: NextRequest,
    context: { params: Promise<Params> }
) {
    return apiRouteWithParams(async (req, params) => {
        const storeId = await getStoreId();
        const { id } = params;
        const body = await req.json();

        if (body.status === "dibatalkan") {
            // Get current transaction to check status
            const { data: current } = await supabaseAdmin
                .from("transaksi")
                .select("status, nomor")
                .eq("id", id)
                .eq("store_id", storeId)
                .single();

            if (!current) {
                return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
            }
            if (current.status === "dibatalkan") {
                return NextResponse.json({ error: "Transaksi sudah dibatalkan" }, { status: 400 });
            }

            // Update status to cancelled
            const { data, error } = await supabaseAdmin
                .from("transaksi")
                .update({
                    status: "dibatalkan",
                    catatan: body.alasan ? `[BATAL] ${body.alasan}` : "[BATAL]",
                    updated_at: new Date().toISOString(),
                })
                .eq("id", id)
                .eq("store_id", storeId)
                .select()
                .single();

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 400 });
            }

            // Restore stock for voided transaction items
            const { data: items } = await supabaseAdmin
                .from("transaksi_item")
                .select("produk_id, jumlah")
                .eq("transaksi_id", id);

            if (items) {
                for (const item of items) {
                    const { data: prod } = await supabaseAdmin
                        .from("produk")
                        .select("stok")
                        .eq("id", item.produk_id)
                        .single();

                    if (prod) {
                        await supabaseAdmin
                            .from("produk")
                            .update({ stok: prod.stok + item.jumlah })
                            .eq("id", item.produk_id);
                    }
                }
            }

            return NextResponse.json({
                id: data.id,
                nomor: data.nomor,
                status: "dibatalkan",
            });
        }

        return NextResponse.json({ error: "Hanya pembatalan yang diizinkan" }, { status: 400 });
    })(req, context);
}

/**
 * DELETE /api/transaksi/[id] - Void transaction (alias)
 */
export async function DELETE(
    req: NextRequest,
    context: { params: Promise<Params> }
) {
    // Delegate to PATCH with status=dibatalkan
    const patchReq = new NextRequest(req.url, {
        method: "PATCH",
        headers: req.headers,
        body: JSON.stringify({ status: "dibatalkan" }),
    });
    return PATCH(patchReq, context);
}
