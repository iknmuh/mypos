import { z } from "zod";

// Jasa status enum
export const JasaStatusEnum = z.enum(["antrian", "dikerjakan", "selesai", "diambil", "dibatalkan"]);
export type JasaStatus = z.infer<typeof JasaStatusEnum>;

// Create jasa schema
export const CreateJasaSchema = z.object({
    kode: z.string().max(50, "Kode jasa terlalu panjang").optional().nullable(),
    nama: z.string().min(1, "Nama jasa wajib diisi").max(255, "Nama jasa terlalu panjang"),
    pelanggan: z.string().max(255, "Nama pelanggan terlalu panjang").optional().nullable(),
    hp: z.string().max(20, "Nomor HP terlalu panjang").optional().nullable(),
    deskripsi: z.string().max(1000, "Deskripsi terlalu panjang").optional().nullable(),
    estimasi: z.string().max(100, "Estimasi terlalu panjang").optional().nullable(),
    harga: z.number().int("Harga harus berupa bilangan bulat").nonnegative("Harga tidak boleh negatif").default(0),
    status: JasaStatusEnum.default("antrian"),
});

export type CreateJasaInput = z.infer<typeof CreateJasaSchema>;

// Update jasa schema
export const UpdateJasaSchema = z.object({
    kode: z.string().max(50, "Kode jasa terlalu panjang").optional().nullable(),
    nama: z.string().min(1, "Nama jasa wajib diisi").max(255, "Nama jasa terlalu panjang").optional(),
    pelanggan: z.string().max(255, "Nama pelanggan terlalu panjang").optional().nullable(),
    hp: z.string().max(20, "Nomor HP terlalu panjang").optional().nullable(),
    deskripsi: z.string().max(1000, "Deskripsi terlalu panjang").optional().nullable(),
    estimasi: z.string().max(100, "Estimasi terlalu panjang").optional().nullable(),
    harga: z.number().int("Harga harus berupa bilangan bulat").nonnegative("Harga tidak boleh negatif").optional(),
    status: JasaStatusEnum.optional(),
});

export type UpdateJasaInput = z.infer<typeof UpdateJasaSchema>;

// Jasa query schema
export const JasaQuerySchema = z.object({
    status: JasaStatusEnum.optional(),
    search: z.string().max(255).optional(),
    from: z.string().date("Format tanggal tidak valid").optional(),
    to: z.string().date("Format tanggal tidak valid").optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(50),
});

export type JasaQueryInput = z.infer<typeof JasaQuerySchema>;
