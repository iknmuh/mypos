import { supabaseAdmin } from "@/lib/supabase";
import { CreateTransaksiInput, TransaksiItem } from "@/lib/validations/transaksi";
import { DatabaseError, NotFoundError, InsufficientStockError } from "@/lib/errors";

/**
 * Result from process_sale RPC function
 */
interface ProcessSaleResult {
    success: boolean;
    invoice_id: string;
    invoice_no: string;
    total_items: number;
}

/**
 * Process a sales transaction atomically using RPC
 */
export async function processSaleAtomic(
    storeId: string,
    input: CreateTransaksiInput
): Promise<ProcessSaleResult> {
    // Prepare items as JSONB
    const itemsJson = input.items.map((item: TransaksiItem) => ({
        produk_id: item.produk_id,
        nama: item.nama,
        harga: item.harga,
        jumlah: item.jumlah,
        diskon: item.diskon,
        subtotal: item.subtotal,
    }));

    const { data, error } = await supabaseAdmin.rpc("process_sale", {
        p_store_id: storeId,
        p_items: itemsJson,
        p_total: input.total,
        p_grand_total: input.grand_total,
        p_bayar: input.bayar,
        p_pelanggan_id: input.pelanggan_id ?? null,
        p_pelanggan: input.pelanggan ?? null,
        p_diskon: input.diskon,
        p_pajak: input.pajak,
        p_kembalian: input.kembalian,
        p_metode: input.metode,
        p_catatan: input.catatan ?? null,
    });

    if (error) {
        // Parse specific error messages
        const errorMessage = error.message.toLowerCase();

        if (errorMessage.includes("stok tidak mencukupi")) {
            // Extract product name from error message
            const match = errorMessage.match(/produk ([^.]+)/);
            const productName = match ? match[1] : "produk";
            throw new InsufficientStockError(
                productName,
                0, // We don't have the exact numbers from the error
                0
            );
        }

        if (errorMessage.includes("produk tidak ditemukan")) {
            throw new NotFoundError("Produk");
        }

        throw new DatabaseError("Gagal memproses transaksi", { originalError: error.message });
    }

    return data as ProcessSaleResult;
}

/**
 * Void a transaction and restore stock atomically
 */
export async function voidTransactionAtomic(
    transaksiId: string,
    storeId: string,
    alasan?: string
): Promise<{ success: boolean; transaksi_id: string; invoice_no: string }> {
    const { data, error } = await supabaseAdmin.rpc("void_transaction", {
        p_transaksi_id: transaksiId,
        p_store_id: storeId,
        p_alasan: alasan ?? null,
    });

    if (error) {
        const errorMessage = error.message.toLowerCase();

        if (errorMessage.includes("tidak ditemukan")) {
            throw new NotFoundError("Transaksi", transaksiId);
        }

        if (errorMessage.includes("sudah dibatalkan")) {
            throw new DatabaseError("Transaksi sudah dibatalkan sebelumnya");
        }

        throw new DatabaseError("Gagal membatalkan transaksi", { originalError: error.message });
    }

    return data;
}

/**
 * Get transaction by ID with items
 */
export async function getTransaksiById(
    transaksiId: string,
    storeId: string
) {
    const { data, error } = await supabaseAdmin
        .from("transaksi")
        .select("*, transaksi_item(*)")
        .eq("id", transaksiId)
        .eq("store_id", storeId)
        .single();

    if (error) {
        if (error.code === "PGRST116") {
            throw new NotFoundError("Transaksi", transaksiId);
        }
        throw new DatabaseError("Gagal mengambil data transaksi");
    }

    return data;
}

/**
 * Get transactions with pagination
 */
export async function getTransaksiList(
    storeId: string,
    options: {
        from?: string;
        to?: string;
        status?: string;
        page?: number;
        limit?: number;
    } = {}
) {
    const { from, to, status, page = 1, limit = 50 } = options;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
        .from("transaksi")
        .select("*, transaksi_item(count)", { count: "exact" })
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });

    if (from) {
        query = query.gte("created_at", from);
    }
    if (to) {
        query = query.lte("created_at", `${to}T23:59:59`);
    }
    if (status) {
        query = query.eq("status", status);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
        throw new DatabaseError("Gagal mengambil daftar transaksi");
    }

    return {
        items: data,
        total: count ?? 0,
        page,
        limit,
        totalPages: Math.ceil((count ?? 0) / limit),
    };
}
