import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStoreId, apiRoute } from "@/lib/api";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    return apiRoute(async () => {
        const storeId = await getStoreId();
        const { id } = await params;
        const { data, error } = await supabaseAdmin
            .from("hutang_piutang").select("*, pembayaran_hp(*)").eq("id", id).eq("store_id", storeId).single();
        if (error) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
        return NextResponse.json(data);
    });
}

// PATCH: Make a payment on a debt
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    return apiRoute(async () => {
        const storeId = await getStoreId();
        const { id } = await params;
        const { jumlah, catatan } = await req.json();

        const { data: hp } = await supabaseAdmin
            .from("hutang_piutang").select("sisa").eq("id", id).eq("store_id", storeId).single();
        if (!hp) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });

        const sisa = hp.sisa - jumlah;
        const status = sisa <= 0 ? "lunas" : "belum_lunas";

        await supabaseAdmin.from("pembayaran_hp").insert({ hutang_id: id, jumlah, catatan });
        const { data, error } = await supabaseAdmin
            .from("hutang_piutang").update({ sisa: Math.max(0, sisa), status }).eq("id", id).select().single();
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json(data);
    });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    return apiRoute(async () => {
        const storeId = await getStoreId();
        const { id } = await params;
        const { error } = await supabaseAdmin.from("hutang_piutang").delete().eq("id", id).eq("store_id", storeId);
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json({ success: true });
    });
}
