import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { apiRoute, getStoreId } from "@/lib/api";

/**
 * GET /api/laporan - Get reports
 * Query params:
 *   - type: sales | products | finance
 *   - period: today | week | month | year
 *   - from: start date
 *   - to: end date
 */
export async function GET(req: NextRequest) {
    return apiRoute(async () => {
        const storeId = await getStoreId();
        const { searchParams } = req.nextUrl;

        const type = searchParams.get("type") ?? searchParams.get("tipe") ?? "sales";
        const period = searchParams.get("period") ?? "month";

        // Calculate date range from period
        const now = new Date();
        let from: string;
        const to = now.toISOString().split("T")[0];

        switch (period) {
            case "today":
                from = to;
                break;
            case "week": {
                const weekAgo = new Date(now);
                weekAgo.setDate(weekAgo.getDate() - 7);
                from = weekAgo.toISOString().split("T")[0];
                break;
            }
            case "year": {
                from = `${now.getFullYear()}-01-01`;
                break;
            }
            default: // month
                from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
                break;
        }

        // Allow explicit from/to override
        const explicitFrom = searchParams.get("from") ?? from;
        const explicitTo = searchParams.get("to") ?? to;

        switch (type) {
            case "sales": {
                const { data, error } = await supabaseAdmin
                    .from("transaksi")
                    .select("nomor, pelanggan, grand_total, metode, status, created_at")
                    .eq("store_id", storeId)
                    .eq("status", "selesai")
                    .gte("created_at", explicitFrom)
                    .lte("created_at", explicitTo + "T23:59:59")
                    .order("created_at", { ascending: false });

                if (error) return NextResponse.json({ error: error.message }, { status: 500 });

                const totalSales = (data ?? []).reduce((sum, t) => sum + (t.grand_total ?? 0), 0);
                return NextResponse.json({
                    transactions: data ?? [],
                    total_sales: totalSales,
                    count: (data ?? []).length,
                });
            }

            case "products": {
                const { data, error } = await supabaseAdmin
                    .from("produk")
                    .select("nama, kategori, stok, stok_minimum, harga_jual")
                    .eq("store_id", storeId)
                    .eq("aktif", true)
                    .order("stok", { ascending: true });

                if (error) return NextResponse.json({ error: error.message }, { status: 500 });

                return NextResponse.json({
                    products: data ?? [],
                    low_stock: (data ?? []).filter(p => p.stok <= p.stok_minimum),
                });
            }

            case "finance": {
                const [trxRes, expRes] = await Promise.all([
                    supabaseAdmin
                        .from("transaksi")
                        .select("grand_total")
                        .eq("store_id", storeId)
                        .eq("status", "selesai")
                        .gte("created_at", explicitFrom)
                        .lte("created_at", explicitTo + "T23:59:59"),
                    supabaseAdmin
                        .from("pengeluaran")
                        .select("jumlah")
                        .eq("store_id", storeId)
                        .gte("tanggal", explicitFrom)
                        .lte("tanggal", explicitTo),
                ]);

                const totalIncome = (trxRes.data ?? []).reduce((sum, t) => sum + (t.grand_total ?? 0), 0);
                const totalExpenses = (expRes.data ?? []).reduce((sum, e) => sum + (e.jumlah ?? 0), 0);

                return NextResponse.json({
                    total_income: totalIncome,
                    total_expenses: totalExpenses,
                    net_profit: totalIncome - totalExpenses,
                });
            }

            default:
                return NextResponse.json({ error: "Tipe laporan tidak valid" }, { status: 400 });
        }
    });
}
