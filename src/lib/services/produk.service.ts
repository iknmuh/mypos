import { supabaseAdmin } from "@/lib/supabase";
import {
    CreateProdukInput,
    UpdateProdukInput,
    StockAdjustmentInput,
    validateStockAdjustment
} from "@/lib/validations/produk";
import { DatabaseError, NotFoundError, ValidationError } from "@/lib/errors";

/**
 * Process stock adjustment atomically using RPC
 */
export async function processStockAdjustmentAtomic(
    storeId: string,
    input: StockAdjustmentInput
): Promise<{
    success: boolean;
    produk_id: string;
    produk_nama: string;
    previous_stok: number;
    new_stok: number;
    adjustment_id: number;
}> {
    const { data, error } = await supabaseAdmin.rpc("process_stock_adjustment", {
        p_store_id: storeId,
        p_produk_id: input.produk_id,
        p_tipe: input.tipe,
        p_jumlah: input.jumlah,
        p_catatan: input.catatan ?? null,
    });

    if (error) {
        const errorMessage = error.message.toLowerCase();

        if (errorMessage.includes("tidak ditemukan")) {
            throw new NotFoundError("Produk", input.produk_id);
        }

        if (errorMessage.includes("stok tidak mencukupi")) {
            throw new ValidationError("Stok tidak mencukupi untuk penyesuaian keluar");
        }

        if (errorMessage.includes("tipe tidak valid")) {
            throw new ValidationError("Tipe penyesuaian tidak valid");
        }

        throw new DatabaseError("Gagal memproses penyesuaian stok", { originalError: error.message });
    }

    return data;
}

/**
 * Get product by ID
 */
export async function getProdukById(
    produkId: string,
    storeId: string
) {
    const { data, error } = await supabaseAdmin
        .from("produk")
        .select("*")
        .eq("id", produkId)
        .eq("store_id", storeId)
        .single();

    if (error) {
        if (error.code === "PGRST116") {
            throw new NotFoundError("Produk", produkId);
        }
        throw new DatabaseError("Gagal mengambil data produk");
    }

    return data;
}

/**
 * Get products with pagination and filtering
 */
export async function getProdukList(
    storeId: string,
    options: {
        search?: string;
        kategori?: string;
        kategori_id?: string;
        aktif?: boolean;
        low_stock?: boolean;
        page?: number;
        limit?: number;
    } = {}
) {
    const { search, kategori, kategori_id, aktif, low_stock, page = 1, limit = 50 } = options;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
        .from("produk")
        .select("*", { count: "exact" })
        .eq("store_id", storeId);

    if (search) {
        query = query.or(`nama.ilike.%${search}%,kode.ilike.%${search}%`);
    }
    if (kategori) {
        query = query.eq("kategori", kategori);
    }
    if (kategori_id) {
        query = query.eq("kategori_id", kategori_id);
    }
    if (aktif !== undefined) {
        query = query.eq("aktif", aktif);
    }
    if (low_stock) {
        // Filter for low stock products
        query = query.lt("stok", supabaseAdmin.rpc("literal", { value: "stok_minimum" }));
    }

    query = query.order("nama").range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
        throw new DatabaseError("Gagal mengambil daftar produk");
    }

    // Filter low stock client-side if needed (since we can't do column comparison in Supabase)
    let filteredData = data;
    if (low_stock) {
        filteredData = data.filter(p => p.stok <= p.stok_minimum);
    }

    return {
        items: filteredData,
        total: count ?? 0,
        page,
        limit,
        totalPages: Math.ceil((count ?? 0) / limit),
    };
}

/**
 * Create a new product
 */
export async function createProduk(
    storeId: string,
    input: CreateProdukInput
) {
    const { data, error } = await supabaseAdmin
        .from("produk")
        .insert({
            ...input,
            store_id: storeId,
        })
        .select()
        .single();

    if (error) {
        if (error.code === "23505") {
            throw new ValidationError("Kode produk sudah digunakan");
        }
        throw new DatabaseError("Gagal membuat produk baru", { originalError: error.message });
    }

    return data;
}

/**
 * Update a product
 */
export async function updateProduk(
    produkId: string,
    storeId: string,
    input: UpdateProdukInput
) {
    const { data, error } = await supabaseAdmin
        .from("produk")
        .update({
            ...input,
            updated_at: new Date().toISOString(),
        })
        .eq("id", produkId)
        .eq("store_id", storeId)
        .select()
        .single();

    if (error) {
        if (error.code === "PGRST116") {
            throw new NotFoundError("Produk", produkId);
        }
        if (error.code === "23505") {
            throw new ValidationError("Kode produk sudah digunakan");
        }
        throw new DatabaseError("Gagal mengupdate produk", { originalError: error.message });
    }

    return data;
}

/**
 * Soft delete a product (set aktif = false)
 */
export async function deleteProduk(
    produkId: string,
    storeId: string
) {
    const { error } = await supabaseAdmin
        .from("produk")
        .update({
            aktif: false,
            updated_at: new Date().toISOString(),
        })
        .eq("id", produkId)
        .eq("store_id", storeId);

    if (error) {
        if (error.code === "PGRST116") {
            throw new NotFoundError("Produk", produkId);
        }
        throw new DatabaseError("Gagal menghapus produk");
    }

    return { success: true };
}

/**
 * Get low stock products
 */
export async function getLowStockProducts(storeId: string, limit: number = 20) {
    const { data, error } = await supabaseAdmin
        .from("produk")
        .select("id, nama, stok, stok_minimum, satuan")
        .eq("store_id", storeId)
        .eq("aktif", true)
        .order("stok", { ascending: true })
        .limit(limit);

    if (error) {
        throw new DatabaseError("Gagal mengambil produk stok rendah");
    }

    // Filter client-side for stok <= stok_minimum
    return data.filter(p => p.stok <= p.stok_minimum);
}

/**
 * Get stock adjustment history
 */
export async function getStockHistory(
    storeId: string,
    options: {
        produk_id?: string;
        page?: number;
        limit?: number;
    } = {}
) {
    const { produk_id, page = 1, limit = 50 } = options;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
        .from("stok_adjustment")
        .select("*, produk(nama)", { count: "exact" })
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });

    if (produk_id) {
        query = query.eq("produk_id", produk_id);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
        throw new DatabaseError("Gagal mengambil riwayat stok");
    }

    return {
        items: data,
        total: count ?? 0,
        page,
        limit,
        totalPages: Math.ceil((count ?? 0) / limit),
    };
}
