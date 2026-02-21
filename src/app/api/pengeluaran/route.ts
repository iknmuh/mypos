import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStoreId, apiRoute } from "@/lib/api";

export async function GET(req: NextRequest) {
    return apiRoute(async () => {
        const storeId = await getStoreId();
        const kategori = req.nextUrl.searchParams.get("kategori");
        const from = req.nextUrl.searchParams.get("from");
        const to = req.nextUrl.searchParams.get("to");

        let query = supabaseAdmin.from("pengeluaran").select("*")
            .eq("store_id", storeId).order("tanggal", { ascending: false });
        if (kategori) query = query.eq("kategori", kategori);
        if (from) query = query.gte("tanggal", from);
        if (to) query = query.lte("tanggal", to);

        const { data, error } = await query;
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
    });
}

export async function POST(req: NextRequest) {
    return apiRoute(async () => {
        const storeId = await getStoreId();
        const body = await req.json();
        const { data, error } = await supabaseAdmin
            .from("pengeluaran").insert({ ...body, store_id: storeId }).select().single();
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json(data, { status: 201 });
    });
}
