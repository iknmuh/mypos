import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStoreId, apiRoute } from "@/lib/api";

export async function GET(req: NextRequest) {
    return apiRoute(async () => {
        const storeId = await getStoreId();
        const produkId = req.nextUrl.searchParams.get("produk_id");
        let query = supabaseAdmin
            .from("stok_adjustment").select("*, produk(nama)")
            .eq("store_id", storeId).order("created_at", { ascending: false }).limit(100);
        if (produkId) query = query.eq("produk_id", produkId);
        const { data, error } = await query;
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
    });
}

export async function POST(req: NextRequest) {
    return apiRoute(async () => {
        const storeId = await getStoreId();
        const { produk_id, tipe, jumlah, catatan } = await req.json();

        const { data: produk, error: pErr } = await supabaseAdmin
            .from("produk").select("stok").eq("id", produk_id).eq("store_id", storeId).single();
        if (pErr || !produk) return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });

        const delta = tipe === "keluar" ? -jumlah : jumlah;
        const stok_akhir = tipe === "koreksi" ? jumlah : produk.stok + delta;
        if (stok_akhir < 0) return NextResponse.json({ error: "Stok tidak mencukupi" }, { status: 422 });

        await supabaseAdmin.from("produk").update({ stok: stok_akhir, updated_at: new Date().toISOString() }).eq("id", produk_id);

        const { data, error } = await supabaseAdmin
            .from("stok_adjustment").insert({ store_id: storeId, produk_id, tipe, jumlah, stok_akhir, catatan }).select().single();
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json(data, { status: 201 });
    });
}
