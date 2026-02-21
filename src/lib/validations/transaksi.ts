import { z } from "zod";

// Payment method enum
export const PaymentMethodEnum = z.enum(["Tunai", "Transfer", "QRIS", "E-Wallet"]);
export type PaymentMethod = z.infer<typeof PaymentMethodEnum>;

// Transaction status enum
export const TransaksiStatusEnum = z.enum(["selesai", "pending", "dibatalkan"]);
export type TransaksiStatus = z.infer<typeof TransaksiStatusEnum>;

// Transaction item schema
export const TransaksiItemSchema = z.object({
    produk_id: z.string().uuid("ID produk tidak valid"),
    nama: z.string().min(1, "Nama produk wajib diisi").max(255, "Nama produk terlalu panjang"),
    harga: z.number().int("Harga harus berupa bilangan bulat").nonnegative("Harga tidak boleh negatif"),
    jumlah: z.number().int("Jumlah harus berupa bilangan bulat").positive("Jumlah harus lebih dari 0"),
    diskon: z.number().int("Diskon harus berupa bilangan bulat").nonnegative("Diskon tidak boleh negatif").default(0),
    subtotal: z.number().int("Subtotal harus berupa bilangan bulat").nonnegative("Subtotal tidak boleh negatif"),
});

export type TransaksiItem = z.infer<typeof TransaksiItemSchema>;

// Create transaction schema
export const CreateTransaksiSchema = z.object({
    items: z.array(TransaksiItemSchema)
        .min(1, "Keranjang tidak boleh kosong")
        .max(100, "Maksimal 100 item per transaksi"),
    pelanggan_id: z.string().uuid("ID pelanggan tidak valid").optional().nullable(),
    pelanggan: z.string().max(255, "Nama pelanggan terlalu panjang").optional().nullable(),
    total: z.number().int("Total harus berupa bilangan bulat").nonnegative("Total tidak boleh negatif"),
    diskon: z.number().int("Diskon harus berupa bilangan bulat").nonnegative("Diskon tidak boleh negatif").default(0),
    pajak: z.number().int("Pajak harus berupa bilangan bulat").nonnegative("Pajak tidak boleh negatif").default(0),
    grand_total: z.number().int("Grand total harus berupa bilangan bulat").nonnegative("Grand total tidak boleh negatif"),
    bayar: z.number().int("Bayar harus berupa bilangan bulat").nonnegative("Bayar tidak boleh negatif"),
    kembalian: z.number().int("Kembalian harus berupa bilangan bulat").nonnegative("Kembalian tidak boleh negatif").default(0),
    metode: PaymentMethodEnum.default("Tunai"),
    catatan: z.string().max(500, "Catatan terlalu panjang").optional().nullable(),
});

export type CreateTransaksiInput = z.infer<typeof CreateTransaksiSchema>;

// Update transaction schema (for status changes)
export const UpdateTransaksiSchema = z.object({
    status: TransaksiStatusEnum,
});

export type UpdateTransaksiInput = z.infer<typeof UpdateTransaksiSchema>;

// Transaction query schema
export const TransaksiQuerySchema = z.object({
    from: z.string().datetime({ message: "Format tanggal tidak valid" }).optional(),
    to: z.string().datetime({ message: "Format tanggal tidak valid" }).optional(),
    status: TransaksiStatusEnum.optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(50),
    search: z.string().max(255).optional(),
});

export type TransaksiQueryInput = z.infer<typeof TransaksiQuerySchema>;

// Validation helper for subtotal calculation
export function validateTransaksiItems(items: TransaksiItem[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const expectedSubtotal = (item.harga * item.jumlah) - item.diskon;

        if (item.subtotal !== expectedSubtotal) {
            errors.push(`Item ${i + 1}: Subtotal tidak sesuai (expected: ${expectedSubtotal}, got: ${item.subtotal})`);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}
