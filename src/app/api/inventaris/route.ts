import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStoreId, apiRoute } from "@/lib/api";

export async function GET(req: NextRequest) {
    return apiRoute(async () => {
        const storeId = await getStoreId();
        const search = req.nextUrl.searchParams.get("search") ?? "";
        const kondisi = req.nextUrl.searchParams.get("kondisi");
        let query = supabaseAdmin.from("inventaris").select("*").eq("store_id", storeId).order("nama");
        if (search) query = query.ilike("nama", `%${search}%`);
        if (kondisi) query = query.eq("kondisi", kondisi);
        const { data, error } = await query;
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
    });
}

export async function POST(req: NextRequest) {
    return apiRoute(async () => {
        const storeId = await getStoreId();
        const body = await req.json();
        const kode = `INV-${Date.now()}`;
        const { data, error } = await supabaseAdmin
            .from("inventaris").insert({ ...body, store_id: storeId, kode }).select().single();
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json(data, { status: 201 });
    });
}
