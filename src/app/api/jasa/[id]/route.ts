import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStoreId, apiRoute } from "@/lib/api";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    return apiRoute(async () => {
        const storeId = await getStoreId();
        const { id } = await params;
        const { data, error } = await supabaseAdmin
            .from("jasa").select("*").eq("id", id).eq("store_id", storeId).single();
        if (error) return NextResponse.json({ error: "Jasa tidak ditemukan" }, { status: 404 });
        return NextResponse.json(data);
    });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    return apiRoute(async () => {
        const storeId = await getStoreId();
        const { id } = await params;
        const body = await req.json();
        const { data, error } = await supabaseAdmin
            .from("jasa").update({ ...body, updated_at: new Date().toISOString() })
            .eq("id", id).eq("store_id", storeId).select().single();
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json(data);
    });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    return apiRoute(async () => {
        const storeId = await getStoreId();
        const { id } = await params;
        const { error } = await supabaseAdmin.from("jasa").delete().eq("id", id).eq("store_id", storeId);
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json({ success: true });
    });
}
