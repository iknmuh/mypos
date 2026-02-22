import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { apiRoute, getStoreId } from "@/lib/api";

/**
 * GET /api/dashboard - Get dashboard statistics
 * Returns plain JSON for frontend compatibility
 */
export async function GET(req: NextRequest) {
    return apiRoute(async () => {
        const storeId = await getStoreId();

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString();

        // Parallel queries for dashboard stats
        const [
            trxTodayRes,
            trxAllRes,
            produkRes,
            lowStockRes,
            pelangganRes,
            hutangRes,
        ] = await Promise.all([
            // Today's transactions
            supabaseAdmin
                .from("transaksi")
                .select("grand_total, status")
                .eq("store_id", storeId)
                .eq("status", "selesai")
                .gte("created_at", todayISO),
            // Recent transactions
            supabaseAdmin
                .from("transaksi")
                .select("nomor, pelanggan, grand_total, metode, status, created_at")
                .eq("store_id", storeId)
                .order("created_at", { ascending: false })
                .limit(10),
            // Products count
            supabaseAdmin
                .from("produk")
                .select("id", { count: "exact", head: true })
                .eq("store_id", storeId)
                .eq("aktif", true),
            // Low stock products
            supabaseAdmin
                .from("produk")
                .select("nama, stok, stok_minimum, satuan")
                .eq("store_id", storeId)
                .eq("aktif", true)
                .order("stok", { ascending: true })
                .limit(20),
            // Customers count
            supabaseAdmin
                .from("pelanggan")
                .select("id", { count: "exact", head: true })
                .eq("store_id", storeId),
            // Upcoming payables
            supabaseAdmin
                .from("hutang_piutang")
                .select("nama, sisa, jatuh_tempo")
                .eq("store_id", storeId)
                .eq("status", "belum_lunas")
                .order("jatuh_tempo", { ascending: true })
                .limit(5),
        ]);

        const trxToday = trxTodayRes.data ?? [];
        const omzetHariIni = trxToday.reduce((sum, t) => sum + (t.grand_total ?? 0), 0);
        const trxCount = trxToday.length;
        const lowStock = (lowStockRes.data ?? []).filter(p => p.stok <= p.stok_minimum);

        return NextResponse.json({
            omzet_hari_ini: omzetHariIni,
            transaksi_hari_ini: trxCount,
            total_produk: produkRes.count ?? 0,
            total_pelanggan: pelangganRes.count ?? 0,
            stok_menipis: lowStock.length,
            recent_transactions: trxAllRes.data ?? [],
            low_stock_products: lowStock,
            upcoming_payables: (hutangRes.data ?? []).map(h => ({
                pihak: h.nama,
                sisa: h.sisa,
                jatuh_tempo: h.jatuh_tempo,
            })),
        });
    });
}
