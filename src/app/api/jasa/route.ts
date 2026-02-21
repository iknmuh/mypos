import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStoreId, apiRoute } from "@/lib/api";

export async function GET(req: NextRequest) {
    return apiRoute(async () => {
        const storeId = await getStoreId();
        const status = req.nextUrl.searchParams.get("status");
        let query = supabaseAdmin.from("jasa").select("*").eq("store_id", storeId).order("created_at", { ascending: false });
        if (status) query = query.eq("status", status);
        const { data, error } = await query;
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
    });
}

export async function POST(req: NextRequest) {
    return apiRoute(async () => {
        const storeId = await getStoreId();
        const body = await req.json();
        const kode = `SVC-${Date.now()}`;
        const { data, error } = await supabaseAdmin
            .from("jasa").insert({ ...body, store_id: storeId, kode }).select().single();
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json(data, { status: 201 });
    });
}
