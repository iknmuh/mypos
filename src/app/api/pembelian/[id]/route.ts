import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStoreId, apiRoute } from "@/lib/api";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    return apiRoute(async () => {
        const storeId = await getStoreId();
        const { id } = await params;
        const { data, error } = await supabaseAdmin
            .from("pembelian").select("*, pembelian_item(*)").eq("id", id).eq("store_id", storeId).single();
        if (error) return NextResponse.json({ error: "Pembelian tidak ditemukan" }, { status: 404 });
        return NextResponse.json(data);
    });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    return apiRoute(async () => {
        const storeId = await getStoreId();
        const { id } = await params;
        const body = await req.json();

        // If marking as "diterima", auto-add stock
        if (body.status === "diterima") {
            const { data: po } = await supabaseAdmin
                .from("pembelian").select("*, pembelian_item(*)").eq("id", id).eq("store_id", storeId).single();
            if (po?.pembelian_item) {
                for (const item of po.pembelian_item) {
                    if (!item.produk_id) continue;
                    const { data: p } = await supabaseAdmin.from("produk").select("stok").eq("id", item.produk_id).single();
                    if (p) {
                        const newStok = p.stok + item.jumlah;
                        await supabaseAdmin.from("produk").update({ stok: newStok, updated_at: new Date().toISOString() }).eq("id", item.produk_id);
                        await supabaseAdmin.from("stok_adjustment").insert({
                            store_id: storeId, produk_id: item.produk_id, tipe: "masuk",
                            jumlah: item.jumlah, stok_akhir: newStok, catatan: `Pembelian - ${po.nomor}`,
                        });
                    }
                }
            }
        }

        const { data, error } = await supabaseAdmin
            .from("pembelian").update(body).eq("id", id).eq("store_id", storeId).select().single();
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json(data);
    });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    return apiRoute(async () => {
        const storeId = await getStoreId();
        const { id } = await params;
        const { error } = await supabaseAdmin
            .from("pembelian").update({ status: "dibatalkan" }).eq("id", id).eq("store_id", storeId);
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json({ success: true });
    });
}
