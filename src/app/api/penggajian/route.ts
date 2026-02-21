import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getStoreId, apiRoute } from "@/lib/api";

export async function GET(req: NextRequest) {
    return apiRoute(async () => {
        const storeId = await getStoreId();
        const karyawanId = req.nextUrl.searchParams.get("karyawan_id");
        let query = supabaseAdmin.from("penggajian").select("*, karyawan(nama)")
            .eq("store_id", storeId).order("created_at", { ascending: false });
        if (karyawanId) query = query.eq("karyawan_id", karyawanId);
        const { data, error } = await query;
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
    });
}

export async function POST(req: NextRequest) {
    return apiRoute(async () => {
        const storeId = await getStoreId();
        const body = await req.json();
        const total = (body.gaji_pokok ?? 0) + (body.tunjangan ?? 0) - (body.potongan ?? 0);
        const { data, error } = await supabaseAdmin
            .from("penggajian").insert({ ...body, total, store_id: storeId }).select().single();
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json(data, { status: 201 });
    });
}
