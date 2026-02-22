import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { apiRoute, getStoreId } from "@/lib/api";

/**
 * GET /api/transaksi - Get transaction list
 * Returns plain array for frontend compatibility
 */
export async function GET(req: NextRequest) {
    return apiRoute(async () => {
        const storeId = await getStoreId();
        const { searchParams } = req.nextUrl;

        const from = searchParams.get("from");
        const to = searchParams.get("to");
        const status = searchParams.get("status");

        let query = supabaseAdmin
            .from("transaksi")
            .select("*, transaksi_item(*)")
            .eq("store_id", storeId)
            .order("created_at", { ascending: false });

        if (from) query = query.gte("created_at", from);
        if (to) query = query.lte("created_at", to + "T23:59:59");
        if (status) query = query.eq("status", status);

        query = query.limit(100);

        const { data, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data ?? []);
    });
}

/**
 * POST /api/transaksi - Create a new transaction
 * Expects: { items, pelanggan, total, diskon, pajak, grand_total, bayar, kembalian, metode, catatan }
 */
export async function POST(req: NextRequest) {
    return apiRoute(async () => {
        const storeId = await getStoreId();
        const body = await req.json();

        if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
            return NextResponse.json({ error: "Keranjang tidak boleh kosong" }, { status: 400 });
        }

        // Generate invoice number
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        const invoiceNo = `INV-${dateStr}-${randomSuffix}`;

        // Insert transaction header
        const { data: transaksi, error: trxError } = await supabaseAdmin
            .from("transaksi")
            .insert({
                store_id: storeId,
                nomor: invoiceNo,
                pelanggan: body.pelanggan || null,
                pelanggan_id: body.pelanggan_id || null,
                total: body.total ?? 0,
                diskon: body.diskon ?? 0,
                pajak: body.pajak ?? 0,
                grand_total: body.grand_total ?? 0,
                bayar: body.bayar ?? 0,
                kembalian: body.kembalian ?? 0,
                metode: body.metode ?? "Tunai",
                catatan: body.catatan || null,
                status: "selesai",
            })
            .select()
            .single();

        if (trxError) {
            return NextResponse.json({ error: trxError.message }, { status: 400 });
        }

        // Insert items
        const items = body.items.map((item: { produk_id: string; nama: string; harga: number; jumlah: number; diskon?: number; subtotal: number }) => ({
            transaksi_id: transaksi.id,
            store_id: storeId,
            produk_id: item.produk_id,
            nama: item.nama,
            harga: item.harga,
            jumlah: item.jumlah,
            diskon: item.diskon ?? 0,
            subtotal: item.subtotal,
        }));

        await supabaseAdmin.from("transaksi_item").insert(items);

        // Update stock for each item
        for (const item of body.items) {
            const { data: prod } = await supabaseAdmin
                .from("produk")
                .select("stok")
                .eq("id", item.produk_id)
                .single();

            if (prod) {
                await supabaseAdmin
                    .from("produk")
                    .update({ stok: prod.stok - item.jumlah })
                    .eq("id", item.produk_id);
            }
        }

        return NextResponse.json({
            id: transaksi.id,
            nomor: transaksi.nomor,
            grand_total: transaksi.grand_total,
        }, { status: 201 });
    });
}
