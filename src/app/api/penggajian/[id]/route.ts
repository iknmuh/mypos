import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStoreId, apiRoute } from "@/lib/api";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    return apiRoute(async () => {
        const storeId = await getStoreId();
        const { id } = await params;
        const body = await req.json();
        const { data, error } = await supabaseAdmin
            .from("penggajian").update(body).eq("id", id).eq("store_id", storeId).select().single();
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json(data);
    });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    return apiRoute(async () => {
        const storeId = await getStoreId();
        const { id } = await params;
        const { error } = await supabaseAdmin.from("penggajian").delete().eq("id", id).eq("store_id", storeId);
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json({ success: true });
    });
}
