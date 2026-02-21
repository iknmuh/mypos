import { z } from "zod";

// Purchase status enum
export const PembelianStatusEnum = z.enum(["draft", "dipesan", "diterima", "dibatalkan"]);
export type PembelianStatus = z.infer<typeof PembelianStatusEnum>;

// Purchase item schema
export const PembelianItemSchema = z.object({
    produk_id: z.string().uuid("ID produk tidak valid").optional().nullable(),
    nama: z.string().min(1, "Nama produk wajib diisi").max(255, "Nama produk terlalu panjang"),
    harga: z.number().int("Harga harus berupa bilangan bulat").nonnegative("Harga tidak boleh negatif"),
    jumlah: z.number().int("Jumlah harus berupa bilangan bulat").positive("Jumlah harus lebih dari 0"),
    subtotal: z.number().int("Subtotal harus berupa bilangan bulat").nonnegative("Subtotal tidak boleh negatif"),
});

export type PembelianItem = z.infer<typeof PembelianItemSchema>;

// Create purchase schema
export const CreatePembelianSchema = z.object({
    supplier_id: z.string().uuid("ID supplier tidak valid").optional().nullable(),
    supplier: z.string().max(255, "Nama supplier terlalu panjang").optional().nullable(),
    items: z.array(PembelianItemSchema)
        .min(1, "Item pembelian tidak boleh kosong")
        .max(100, "Maksimal 100 item per pembelian"),
    catatan: z.string().max(500, "Catatan terlalu panjang").optional().nullable(),
    tanggal_po: z.string().date("Format tanggal PO tidak valid").optional(),
    status: PembelianStatusEnum.default("draft"),
});

export type CreatePembelianInput = z.infer<typeof CreatePembelianSchema>;

// Update purchase schema
export const UpdatePembelianSchema = z.object({
    supplier_id: z.string().uuid("ID supplier tidak valid").optional().nullable(),
    supplier: z.string().max(255, "Nama supplier terlalu panjang").optional().nullable(),
    catatan: z.string().max(500, "Catatan terlalu panjang").optional().nullable(),
    tanggal_po: z.string().date("Format tanggal PO tidak valid").optional(),
    tanggal_terima: z.string().date("Format tanggal terima tidak valid").optional(),
    status: PembelianStatusEnum.optional(),
});

export type UpdatePembelianInput = z.infer<typeof UpdatePembelianSchema>;

// Purchase query schema
export const PembelianQuerySchema = z.object({
    status: PembelianStatusEnum.optional(),
    supplier_id: z.string().uuid("ID supplier tidak valid").optional(),
    from: z.string().date("Format tanggal tidak valid").optional(),
    to: z.string().date("Format tanggal tidak valid").optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(50),
});

export type PembelianQueryInput = z.infer<typeof PembelianQuerySchema>;

// Validation helper for purchase items
export function validatePembelianItems(items: PembelianItem[]): { valid: boolean; errors: string[]; total: number } {
    const errors: string[] = [];
    let total = 0;

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const expectedSubtotal = item.harga * item.jumlah;

        if (item.subtotal !== expectedSubtotal) {
            errors.push(`Item ${i + 1}: Subtotal tidak sesuai (expected: ${expectedSubtotal}, got: ${item.subtotal})`);
        }

        total += item.subtotal;
    }

    return {
        valid: errors.length === 0,
        errors,
        total,
    };
}
