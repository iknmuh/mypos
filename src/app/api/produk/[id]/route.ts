import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStoreId, apiRoute, apiRouteWithParams } from "@/lib/api";

type Params = { id: string };

/**
 * GET /api/produk/[id] - Get product by ID
 */
export async function GET(
    req: NextRequest,
    context: { params: Promise<Params> }
) {
    return apiRouteWithParams(async (_req, params) => {
        const storeId = await getStoreId();
        const { id } = params;

        const { data, error } = await supabaseAdmin
            .from("produk")
            .select("*")
            .eq("id", id)
            .eq("store_id", storeId)
            .single();

        if (error) {
            return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
        }

        return NextResponse.json(data);
    })(req, context);
}

/**
 * PATCH /api/produk/[id] - Update product
 */
export async function PATCH(
    req: NextRequest,
    context: { params: Promise<Params> }
) {
    return apiRouteWithParams(async (req, params) => {
        const storeId = await getStoreId();
        const { id } = params;
        const body = await req.json();

        const { data, error } = await supabaseAdmin
            .from("produk")
            .update({
                ...(body.nama !== undefined && { nama: body.nama }),
                ...(body.kode !== undefined && { kode: body.kode || null }),
                ...(body.kategori !== undefined && { kategori: body.kategori || null }),
                ...(body.satuan !== undefined && { satuan: body.satuan }),
                ...(body.harga_beli !== undefined && { harga_beli: Number(body.harga_beli) }),
                ...(body.harga_jual !== undefined && { harga_jual: Number(body.harga_jual) }),
                ...(body.stok !== undefined && { stok: Number(body.stok) }),
                ...(body.stok_minimum !== undefined && { stok_minimum: Number(body.stok_minimum) }),
                updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .eq("store_id", storeId)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json(data);
    })(req, context);
}

/**
 * DELETE /api/produk/[id] - Soft delete product
 */
export async function DELETE(
    req: NextRequest,
    context: { params: Promise<Params> }
) {
    return apiRouteWithParams(async (_req, params) => {
        const storeId = await getStoreId();
        const { id } = params;

        const { error } = await supabaseAdmin
            .from("produk")
            .update({ aktif: false, updated_at: new Date().toISOString() })
            .eq("id", id)
            .eq("store_id", storeId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    })(req, context);
}
