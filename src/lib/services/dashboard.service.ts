import { supabaseAdmin } from "@/lib/supabase";
import { DatabaseError } from "@/lib/errors";

/**
 * Dashboard statistics interface
 */
export interface DashboardStats {
    omzet_today: number;
    transaksi_today: number;
    new_customers: number;
    low_stock: Array<{
        id: string;
        nama: string;
        stok: number;
        stok_minimum: number;
    }>;
    recent_transaksi: Array<{
        id: string;
        nomor: string;
        pelanggan: string | null;
        grand_total: number;
        metode: string;
        created_at: string;
    }>;
    upcoming_hutang: Array<{
        id: string;
        nama: string;
        jumlah: number;
        sisa: number;
        jatuh_tempo: string | null;
    }>;
}

/**
 * Get dashboard statistics using RPC function
 */
export async function getDashboardStatsAtomic(storeId: string): Promise<DashboardStats> {
    const { data, error } = await supabaseAdmin.rpc("get_dashboard_stats", {
        p_store_id: storeId,
    });

    if (error) {
        throw new DatabaseError("Gagal mengambil statistik dashboard", { originalError: error.message });
    }

    return data as DashboardStats;
}

/**
 * Get dashboard statistics (fallback with individual queries)
 * Use this if RPC function is not available
 */
export async function getDashboardStats(storeId: string): Promise<DashboardStats> {
    const today = new Date().toISOString().split("T")[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    // Run all queries in parallel
    const [
        todaySalesResult,
        newCustomersResult,
        lowStockResult,
        recentSalesResult,
        payablesResult,
    ] = await Promise.all([
        // Today's sales
        supabaseAdmin
            .from("transaksi")
            .select("grand_total")
            .eq("store_id", storeId)
            .eq("status", "selesai")
            .gte("created_at", today),

        // New customers this month
        supabaseAdmin
            .from("pelanggan")
            .select("id", { count: "exact", head: true })
            .eq("store_id", storeId)
            .gte("created_at", monthStart),

        // Low stock products
        supabaseAdmin
            .from("produk")
            .select("id, nama, stok, stok_minimum")
            .eq("store_id", storeId)
            .eq("aktif", true),

        // Recent sales
        supabaseAdmin
            .from("transaksi")
            .select("id, nomor, pelanggan, grand_total, metode, created_at")
            .eq("store_id", storeId)
            .eq("status", "selesai")
            .order("created_at", { ascending: false })
            .limit(5),

        // Upcoming payables
        supabaseAdmin
            .from("hutang_piutang")
            .select("id, nama, jumlah, sisa, jatuh_tempo")
            .eq("store_id", storeId)
            .eq("tipe", "hutang")
            .eq("status", "belum_lunas")
            .order("jatuh_tempo")
            .limit(5),
    ]);

    // Check for errors
    if (todaySalesResult.error) {
        throw new DatabaseError("Gagal mengambil data penjualan hari ini");
    }
    if (newCustomersResult.error) {
        throw new DatabaseError("Gagal mengambil data pelanggan baru");
    }
    if (lowStockResult.error) {
        throw new DatabaseError("Gagal mengambil data stok rendah");
    }
    if (recentSalesResult.error) {
        throw new DatabaseError("Gagal mengambil data transaksi terbaru");
    }
    if (payablesResult.error) {
        throw new DatabaseError("Gagal mengambil data hutang");
    }

    // Calculate today's stats
    const omzet_today = (todaySalesResult.data ?? []).reduce(
        (sum, t) => sum + (t.grand_total ?? 0),
        0
    );
    const transaksi_today = todaySalesResult.data?.length ?? 0;

    // Filter low stock products
    const low_stock = (lowStockResult.data ?? [])
        .filter((p) => p.stok <= p.stok_minimum)
        .slice(0, 10);

    return {
        omzet_today,
        transaksi_today,
        new_customers: newCustomersResult.count ?? 0,
        low_stock,
        recent_transaksi: recentSalesResult.data ?? [],
        upcoming_hutang: payablesResult.data ?? [],
    };
}

/**
 * Get sales report data
 */
export async function getSalesReport(
    storeId: string,
    from: string,
    to: string
) {
    const { data, error } = await supabaseAdmin
        .from("transaksi")
        .select(`
            id,
            nomor,
            pelanggan,
            grand_total,
            metode,
            status,
            created_at,
            transaksi_item(nama, jumlah, subtotal)
        `)
        .eq("store_id", storeId)
        .gte("created_at", from)
        .lte("created_at", `${to}T23:59:59`)
        .order("created_at", { ascending: false });

    if (error) {
        throw new DatabaseError("Gagal mengambil laporan penjualan");
    }

    const completedTransactions = (data ?? []).filter((t) => t.status === "selesai");
    const totalOmzet = completedTransactions.reduce((sum, t) => sum + (t.grand_total ?? 0), 0);
    const totalTransaksi = completedTransactions.length;

    return {
        data,
        summary: {
            totalOmzet,
            totalTransaksi,
            rataRata: totalTransaksi > 0 ? Math.round(totalOmzet / totalTransaksi) : 0,
        },
    };
}

/**
 * Get product sales report
 */
export async function getProductReport(
    storeId: string,
    from: string,
    to: string
) {
    const { data, error } = await supabaseAdmin
        .from("transaksi_item")
        .select(`
            nama,
            jumlah,
            subtotal,
            transaksi!inner(store_id, status, created_at)
        `)
        .eq("transaksi.store_id", storeId)
        .eq("transaksi.status", "selesai")
        .gte("transaksi.created_at", from)
        .lte("transaksi.created_at", `${to}T23:59:59`);

    if (error) {
        throw new DatabaseError("Gagal mengambil laporan produk");
    }

    // Aggregate by product name
    const productMap: Record<string, { jumlah: number; revenue: number }> = {};

    for (const item of data ?? []) {
        if (!productMap[item.nama]) {
            productMap[item.nama] = { jumlah: 0, revenue: 0 };
        }
        productMap[item.nama].jumlah += item.jumlah;
        productMap[item.nama].revenue += item.subtotal;
    }

    const topProducts = Object.entries(productMap)
        .map(([nama, stats]) => ({ nama, ...stats }))
        .sort((a, b) => b.revenue - a.revenue);

    return { data: topProducts };
}

/**
 * Get financial report
 */
export async function getFinancialReport(
    storeId: string,
    from: string,
    to: string
) {
    // Run all queries in parallel
    const [salesResult, expensesResult, payrollResult] = await Promise.all([
        supabaseAdmin
            .from("transaksi")
            .select("grand_total")
            .eq("store_id", storeId)
            .eq("status", "selesai")
            .gte("created_at", from)
            .lte("created_at", `${to}T23:59:59`),

        supabaseAdmin
            .from("pengeluaran")
            .select("jumlah")
            .eq("store_id", storeId)
            .gte("tanggal", from)
            .lte("tanggal", to),

        supabaseAdmin
            .from("penggajian")
            .select("total")
            .eq("store_id", storeId)
            .eq("status", "dibayar")
            .gte("created_at", from)
            .lte("created_at", `${to}T23:59:59`),
    ]);

    // Check for errors
    if (salesResult.error || expensesResult.error || payrollResult.error) {
        throw new DatabaseError("Gagal mengambil laporan keuangan");
    }

    const pemasukan = (salesResult.data ?? []).reduce(
        (sum, t) => sum + (t.grand_total ?? 0),
        0
    );
    const pengeluaran = (expensesResult.data ?? []).reduce(
        (sum, e) => sum + (e.jumlah ?? 0),
        0
    );
    const totalGaji = (payrollResult.data ?? []).reduce(
        (sum, g) => sum + (g.total ?? 0),
        0
    );

    return {
        pemasukan,
        pengeluaran: pengeluaran + totalGaji,
        laba: pemasukan - pengeluaran - totalGaji,
    };
}
