import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStoreId, apiRoute } from "@/lib/api";

export async function GET(req: NextRequest) {
    return apiRoute(async () => {
        const storeId = await getStoreId();
        const status = req.nextUrl.searchParams.get("status");
        let query = supabaseAdmin
            .from("pembelian").select("*, pembelian_item(*)")
            .eq("store_id", storeId).order("created_at", { ascending: false });
        if (status) query = query.eq("status", status);
        const { data, error } = await query;
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
    });
}

export async function POST(req: NextRequest) {
    return apiRoute(async () => {
        const storeId = await getStoreId();
        const { items, ...header } = await req.json();
        const nomor = `PO-${Date.now()}`;

        const { data: po, error: poErr } = await supabaseAdmin
            .from("pembelian").insert({ ...header, store_id: storeId, nomor, status: header.status ?? "draft" }).select().single();
        if (poErr) return NextResponse.json({ error: poErr.message }, { status: 400 });

        if (items?.length) {
            const poItems = items.map((i: { produk_id?: string; nama: string; harga: number; jumlah: number; subtotal: number }) => ({
                pembelian_id: po.id, ...i,
            }));
            await supabaseAdmin.from("pembelian_item").insert(poItems);
        }

        return NextResponse.json(po, { status: 201 });
    });
}
