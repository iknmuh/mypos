import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStoreId, apiRoute } from "@/lib/api";

export async function GET() {
    return apiRoute(async () => {
        const storeId = await getStoreId();
        const { data, error } = await supabaseAdmin
            .from("pengaturan_toko").select("*").eq("store_id", storeId).single();
        if (error) {
            // Auto-create default settings for new stores
            const { data: newSettings, error: cErr } = await supabaseAdmin
                .from("pengaturan_toko").insert({ store_id: storeId, nama: "MyPOS Store" }).select().single();
            if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
            return NextResponse.json(newSettings);
        }
        return NextResponse.json(data);
    });
}

export async function PUT(req: NextRequest) {
    return apiRoute(async () => {
        const storeId = await getStoreId();
        const body = await req.json();
        const { data, error } = await supabaseAdmin
            .from("pengaturan_toko")
            .upsert({ ...body, store_id: storeId, updated_at: new Date().toISOString() }, { onConflict: "store_id" })
            .select().single();
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json(data);
    });
}
