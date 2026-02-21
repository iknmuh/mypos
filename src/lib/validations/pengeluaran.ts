import { z } from "zod";

// Pengeluaran schema
export const CreatePengeluaranSchema = z.object({
    kategori: z.string().min(1, "Kategori wajib diisi").max(100, "Kategori terlalu panjang"),
    deskripsi: z.string().max(500, "Deskripsi terlalu panjang").optional().nullable(),
    jumlah: z.number().int("Jumlah harus berupa bilangan bulat").positive("Jumlah harus lebih dari 0"),
    tanggal: z.string().date("Format tanggal tidak valid").optional(),
});

export type CreatePengeluaranInput = z.infer<typeof CreatePengeluaranSchema>;

// Update pengeluaran schema
export const UpdatePengeluaranSchema = z.object({
    kategori: z.string().min(1, "Kategori wajib diisi").max(100, "Kategori terlalu panjang").optional(),
    deskripsi: z.string().max(500, "Deskripsi terlalu panjang").optional().nullable(),
    jumlah: z.number().int("Jumlah harus berupa bilangan bulat").positive("Jumlah harus lebih dari 0").optional(),
    tanggal: z.string().date("Format tanggal tidak valid").optional(),
});

export type UpdatePengeluaranInput = z.infer<typeof UpdatePengeluaranSchema>;

// Pengeluaran query schema
export const PengeluaranQuerySchema = z.object({
    kategori: z.string().max(100).optional(),
    from: z.string().date("Format tanggal tidak valid").optional(),
    to: z.string().date("Format tanggal tidak valid").optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(50),
});

export type PengeluaranQueryInput = z.infer<typeof PengeluaranQuerySchema>;
