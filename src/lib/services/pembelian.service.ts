import { supabaseAdmin } from "@/lib/supabase";
import {
    CreatePembelianInput,
    UpdatePembelianInput,
    PembelianItem,
    validatePembelianItems
} from "@/lib/validations/pembelian";
import { DatabaseError, NotFoundError, ValidationError } from "@/lib/errors";

/**
 * Process purchase receipt atomically using RPC
 */
export async function processPurchaseReceiptAtomic(
    purchaseId: string,
    storeId: string
): Promise<{
    success: boolean;
    purchase_id: string;
    total_items: number;
}> {
    const { data, error } = await supabaseAdmin.rpc("process_purchase_receipt", {
        p_purchase_id: purchaseId,
        p_store_id: storeId,
    });

    if (error) {
        const errorMessage = error.message.toLowerCase();

        if (errorMessage.includes("tidak ditemukan")) {
            throw new NotFoundError("Pembelian", purchaseId);
        }

        if (errorMessage.includes("sudah diterima")) {
            throw new ValidationError("Pembelian sudah diterima sebelumnya");
        }

        if (errorMessage.includes("sudah dibatalkan")) {
            throw new ValidationError("Pembelian sudah dibatalkan");
        }

        throw new DatabaseError("Gagal memproses penerimaan pembelian", { originalError: error.message });
    }

    return data;
}

/**
 * Get purchase by ID with items
 */
export async function getPembelianById(
    pembelianId: string,
    storeId: string
) {
    const { data, error } = await supabaseAdmin
        .from("pembelian")
        .select("*, pembelian_item(*)")
        .eq("id", pembelianId)
        .eq("store_id", storeId)
        .single();

    if (error) {
        if (error.code === "PGRST116") {
            throw new NotFoundError("Pembelian", pembelianId);
        }
        throw new DatabaseError("Gagal mengambil data pembelian");
    }

    return data;
}

/**
 * Get purchases with pagination and filtering
 */
export async function getPembelianList(
    storeId: string,
    options: {
        status?: string;
        supplier_id?: string;
        from?: string;
        to?: string;
        page?: number;
        limit?: number;
    } = {}
) {
    const { status, supplier_id, from, to, page = 1, limit = 50 } = options;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
        .from("pembelian")
        .select("*, pembelian_item(count)", { count: "exact" })
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });

    if (status) {
        query = query.eq("status", status);
    }
    if (supplier_id) {
        query = query.eq("supplier_id", supplier_id);
    }
    if (from) {
        query = query.gte("tanggal_po", from);
    }
    if (to) {
        query = query.lte("tanggal_po", to);
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);

    if (error) {
        throw new DatabaseError("Gagal mengambil daftar pembelian");
    }

    return {
        items: data,
        total: count ?? 0,
        page,
        limit,
        totalPages: Math.ceil((count ?? 0) / limit),
    };
}

/**
 * Create a new purchase order
 */
export async function createPembelian(
    storeId: string,
    input: CreatePembelianInput
) {
    // Generate purchase number
    const nomor = `PO-${Date.now()}`;

    // Start by creating the purchase header
    const { data: pembelian, error: headerError } = await supabaseAdmin
        .from("pembelian")
        .insert({
            store_id: storeId,
            nomor,
            supplier_id: input.supplier_id ?? null,
            supplier: input.supplier ?? null,
            catatan: input.catatan ?? null,
            tanggal_po: input.tanggal_po ?? new Date().toISOString().split("T")[0],
            status: input.status ?? "draft",
            total: 0, // Will be calculated
        })
        .select()
        .single();

    if (headerError) {
        throw new DatabaseError("Gagal membuat pembelian", { originalError: headerError.message });
    }

    // Insert items if provided
    if (input.items && input.items.length > 0) {
        const items = input.items.map((item: PembelianItem) => ({
            pembelian_id: pembelian.id,
            produk_id: item.produk_id ?? null,
            nama: item.nama,
            harga: item.harga,
            jumlah: item.jumlah,
            subtotal: item.subtotal,
        }));

        const { error: itemsError } = await supabaseAdmin
            .from("pembelian_item")
            .insert(items);

        if (itemsError) {
            // Try to clean up the header
            await supabaseAdmin.from("pembelian").delete().eq("id", pembelian.id);
            throw new DatabaseError("Gagal menambahkan item pembelian", { originalError: itemsError.message });
        }

        // Calculate total
        const total = items.reduce((sum: number, item: { subtotal: number }) => sum + item.subtotal, 0);

        // Update total
        await supabaseAdmin
            .from("pembelian")
            .update({ total })
            .eq("id", pembelian.id);

        pembelian.total = total;
    }

    return pembelian;
}

/**
 * Update a purchase order
 */
export async function updatePembelian(
    pembelianId: string,
    storeId: string,
    input: UpdatePembelianInput
) {
    // Check if purchase exists and can be updated
    const existing = await getPembelianById(pembelianId, storeId);

    if (existing.status === "diterima") {
        throw new ValidationError("Pembelian yang sudah diterima tidak dapat diubah");
    }

    if (existing.status === "dibatalkan") {
        throw new ValidationError("Pembelian yang sudah dibatalkan tidak dapat diubah");
    }

    const { data, error } = await supabaseAdmin
        .from("pembelian")
        .update(input)
        .eq("id", pembelianId)
        .eq("store_id", storeId)
        .select()
        .single();

    if (error) {
        throw new DatabaseError("Gagal mengupdate pembelian", { originalError: error.message });
    }

    return data;
}

/**
 * Cancel a purchase order
 */
export async function cancelPembelian(
    pembelianId: string,
    storeId: string
) {
    // Check if purchase exists and can be cancelled
    const existing = await getPembelianById(pembelianId, storeId);

    if (existing.status === "diterima") {
        throw new ValidationError("Pembelian yang sudah diterima tidak dapat dibatalkan");
    }

    if (existing.status === "dibatalkan") {
        throw new ValidationError("Pembelian sudah dibatalkan sebelumnya");
    }

    const { error } = await supabaseAdmin
        .from("pembelian")
        .update({ status: "dibatalkan" })
        .eq("id", pembelianId)
        .eq("store_id", storeId);

    if (error) {
        throw new DatabaseError("Gagal membatalkan pembelian");
    }

    return { success: true };
}
