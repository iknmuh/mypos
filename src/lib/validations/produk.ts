import { z } from "zod";

// Product category schema
export const KategoriProdukSchema = z.object({
    nama: z.string().min(1, "Nama kategori wajib diisi").max(100, "Nama kategori terlalu panjang"),
});

export type KategoriProdukInput = z.infer<typeof KategoriProdukSchema>;

// Product schema
export const ProdukSchema = z.object({
    kode: z.string().max(50, "Kode produk terlalu panjang").optional().nullable(),
    nama: z.string().min(1, "Nama produk wajib diisi").max(255, "Nama produk terlalu panjang"),
    kategori_id: z.string().uuid("ID kategori tidak valid").optional().nullable(),
    kategori: z.string().max(100, "Nama kategori terlalu panjang").optional().nullable(),
    satuan: z.string().max(20, "Satuan terlalu panjang").default("pcs"),
    harga_beli: z.number().int("Harga beli harus berupa bilangan bulat").nonnegative("Harga beli tidak boleh negatif").default(0),
    harga_jual: z.number().int("Harga jual harus berupa bilangan bulat").nonnegative("Harga jual tidak boleh negatif").default(0),
    stok: z.number().int("Stok harus berupa bilangan bulat").nonnegative("Stok tidak boleh negatif").default(0),
    stok_minimum: z.number().int("Stok minimum harus berupa bilangan bulat").nonnegative("Stok minimum tidak boleh negatif").default(0),
    gambar_url: z.string().url("URL gambar tidak valid").optional().nullable(),
    aktif: z.boolean().default(true),
});

export type ProdukInput = z.infer<typeof ProdukSchema>;

// Create product schema
export const CreateProdukSchema = ProdukSchema.omit({ aktif: true });

export type CreateProdukInput = z.infer<typeof CreateProdukSchema>;

// Update product schema
export const UpdateProdukSchema = ProdukSchema.partial();

export type UpdateProdukInput = z.infer<typeof UpdateProdukSchema>;

// Product query schema
export const ProdukQuerySchema = z.object({
    search: z.string().max(255).optional(),
    kategori: z.string().max(100).optional(),
    kategori_id: z.string().uuid("ID kategori tidak valid").optional(),
    aktif: z.coerce.boolean().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(50),
    low_stock: z.coerce.boolean().optional(),
});

export type ProdukQueryInput = z.infer<typeof ProdukQuerySchema>;

// Stock adjustment schema
export const StockAdjustmentTypeEnum = z.enum(["masuk", "keluar", "koreksi"]);
export type StockAdjustmentType = z.infer<typeof StockAdjustmentTypeEnum>;

export const StockAdjustmentSchema = z.object({
    produk_id: z.string().uuid("ID produk tidak valid"),
    tipe: StockAdjustmentTypeEnum,
    jumlah: z.number().int("Jumlah harus berupa bilangan bulat").positive("Jumlah harus lebih dari 0"),
    catatan: z.string().max(500, "Catatan terlalu panjang").optional().nullable(),
});

export type StockAdjustmentInput = z.infer<typeof StockAdjustmentSchema>;

// Validation helper for stock operations
export function validateStockAdjustment(
    currentStock: number,
    tipe: StockAdjustmentType,
    jumlah: number
): { valid: boolean; newStock: number; error?: string } {
    let newStock: number;

    switch (tipe) {
        case "masuk":
            newStock = currentStock + jumlah;
            break;
        case "keluar":
            if (currentStock < jumlah) {
                return {
                    valid: false,
                    newStock: currentStock,
                    error: `Stok tidak mencukupi. Stok saat ini: ${currentStock}, diminta: ${jumlah}`,
                };
            }
            newStock = currentStock - jumlah;
            break;
        case "koreksi":
            newStock = jumlah;
            break;
        default:
            return {
                valid: false,
                newStock: currentStock,
                error: "Tipe penyesuaian tidak valid",
            };
    }

    if (newStock < 0) {
        return {
            valid: false,
            newStock: currentStock,
            error: "Stok tidak boleh negatif",
        };
    }

    return { valid: true, newStock };
}
