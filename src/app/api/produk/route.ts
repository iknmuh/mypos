import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStoreId, apiRoute } from "@/lib/api";

/**
 * GET /api/produk - Get product list
 * Returns plain array for frontend compatibility
 */
export async function GET(req: NextRequest) {
    return apiRoute(async () => {
        const storeId = await getStoreId();
        const { searchParams } = req.nextUrl;

        const search = searchParams.get("search") ?? undefined;
        const kategori = searchParams.get("kategori") ?? undefined;
        const aktif = searchParams.get("aktif");
        const lowStock = searchParams.get("low_stock");

        let query = supabaseAdmin
            .from("produk")
            .select("*")
            .eq("store_id", storeId);

        if (search) {
            query = query.or(`nama.ilike.%${search}%,kode.ilike.%${search}%`);
        }
        if (kategori) {
            query = query.eq("kategori", kategori);
        }
        if (aktif !== null && aktif !== undefined) {
            query = query.eq("aktif", aktif === "true");
        }

        query = query.order("nama");

        const { data, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Filter low stock client-side if requested
        let result = data ?? [];
        if (lowStock === "true") {
            result = result.filter((p: { stok: number; stok_minimum: number }) => p.stok <= p.stok_minimum);
        }

        return NextResponse.json(result);
    });
}

/**
 * POST /api/produk - Create a new product
 */
export async function POST(req: NextRequest) {
    return apiRoute(async () => {
        const storeId = await getStoreId();
        const body = await req.json();

        if (!body.nama || typeof body.nama !== "string" || body.nama.trim().length === 0) {
            return NextResponse.json({ error: "Nama produk wajib diisi" }, { status: 400 });
        }

        const { data, error } = await supabaseAdmin
            .from("produk")
            .insert({
                store_id: storeId,
                kode: body.kode || null,
                nama: body.nama.trim(),
                kategori: body.kategori || null,
                satuan: body.satuan || "Pcs",
                harga_beli: Number(body.harga_beli) || 0,
                harga_jual: Number(body.harga_jual) || 0,
                stok: Number(body.stok) || 0,
                stok_minimum: Number(body.stok_minimum) || 0,
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json(data, { status: 201 });
    });
}
