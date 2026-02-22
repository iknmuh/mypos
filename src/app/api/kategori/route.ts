import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStoreId, apiRoute } from "@/lib/api";

export async function GET() {
    return apiRoute(async () => {
        const storeId = await getStoreId();
        const { data, error } = await supabaseAdmin
            .from("kategori_produk").select("*").eq("store_id", storeId).order("nama");
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
    });
}

export async function POST(req: NextRequest) {
    return apiRoute(async () => {
        const storeId = await getStoreId();
        const { nama } = await req.json();
        if (!nama || typeof nama !== "string" || nama.trim().length === 0) {
            return NextResponse.json({ error: "Nama kategori wajib diisi" }, { status: 400 });
        }
        const { data, error } = await supabaseAdmin
            .from("kategori_produk").insert({ nama: nama.trim(), store_id: storeId }).select().single();
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json(data, { status: 201 });
    });
}

export async function PUT(req: NextRequest) {
    return apiRoute(async () => {
        const storeId = await getStoreId();
        const { id, nama } = await req.json();
        if (!id) {
            return NextResponse.json({ error: "ID kategori wajib diisi" }, { status: 400 });
        }
        if (!nama || typeof nama !== "string" || nama.trim().length === 0) {
            return NextResponse.json({ error: "Nama kategori wajib diisi" }, { status: 400 });
        }
        const { data, error } = await supabaseAdmin
            .from("kategori_produk").update({ nama: nama.trim() }).eq("id", id).eq("store_id", storeId).select().single();
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json(data);
    });
}

export async function DELETE(req: NextRequest) {
    return apiRoute(async () => {
        const storeId = await getStoreId();
        const { id } = await req.json();
        if (!id) {
            return NextResponse.json({ error: "ID kategori wajib diisi" }, { status: 400 });
        }
        const { error } = await supabaseAdmin
            .from("kategori_produk").delete().eq("id", id).eq("store_id", storeId);
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json({ success: true });
    });
}
