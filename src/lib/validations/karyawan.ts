import { z } from "zod";

// Karyawan status enum
export const KaryawanStatusEnum = z.enum(["aktif", "nonaktif"]);
export type KaryawanStatus = z.infer<typeof KaryawanStatusEnum>;

// Penggajian status enum
export const PenggajianStatusEnum = z.enum(["belum_dibayar", "dibayar"]);
export type PenggajianStatus = z.infer<typeof PenggajianStatusEnum>;

// Create karyawan schema
export const CreateKaryawanSchema = z.object({
    nama: z.string().min(1, "Nama wajib diisi").max(255, "Nama terlalu panjang"),
    jabatan: z.string().max(100, "Jabatan terlalu panjang").optional().nullable(),
    hp: z.string().max(20, "Nomor HP terlalu panjang").optional().nullable(),
    alamat: z.string().max(500, "Alamat terlalu panjang").optional().nullable(),
    tanggal_masuk: z.string().date("Format tanggal masuk tidak valid").optional().nullable(),
    gaji_pokok: z.number().int("Gaji pokok harus berupa bilangan bulat").nonnegative("Gaji pokok tidak boleh negatif").default(0),
    status: KaryawanStatusEnum.default("aktif"),
});

export type CreateKaryawanInput = z.infer<typeof CreateKaryawanSchema>;

// Update karyawan schema
export const UpdateKaryawanSchema = z.object({
    nama: z.string().min(1, "Nama wajib diisi").max(255, "Nama terlalu panjang").optional(),
    jabatan: z.string().max(100, "Jabatan terlalu panjang").optional().nullable(),
    hp: z.string().max(20, "Nomor HP terlalu panjang").optional().nullable(),
    alamat: z.string().max(500, "Alamat terlalu panjang").optional().nullable(),
    tanggal_masuk: z.string().date("Format tanggal masuk tidak valid").optional().nullable(),
    gaji_pokok: z.number().int("Gaji pokok harus berupa bilangan bulat").nonnegative("Gaji pokok tidak boleh negatif").optional(),
    status: KaryawanStatusEnum.optional(),
});

export type UpdateKaryawanInput = z.infer<typeof UpdateKaryawanSchema>;

// Create penggajian schema
export const CreatePenggajianSchema = z.object({
    karyawan_id: z.string().uuid("ID karyawan tidak valid"),
    periode: z.string().min(1, "Periode wajib diisi").max(50, "Periode terlalu panjang"),
    gaji_pokok: z.number().int("Gaji pokok harus berupa bilangan bulat").nonnegative("Gaji pokok tidak boleh negatif"),
    tunjangan: z.number().int("Tunjangan harus berupa bilangan bulat").nonnegative("Tunjangan tidak boleh negatif").default(0),
    potongan: z.number().int("Potongan harus berupa bilangan bulat").nonnegative("Potongan tidak boleh negatif").default(0),
    total: z.number().int("Total harus berupa bilangan bulat").nonnegative("Total tidak boleh negatif"),
    status: PenggajianStatusEnum.default("belum_dibayar"),
});

export type CreatePenggajianInput = z.infer<typeof CreatePenggajianSchema>;

// Update penggajian schema
export const UpdatePenggajianSchema = z.object({
    tunjangan: z.number().int("Tunjangan harus berupa bilangan bulat").nonnegative("Tunjangan tidak boleh negatif").optional(),
    potongan: z.number().int("Potongan harus berupa bilangan bulat").nonnegative("Potongan tidak boleh negatif").optional(),
    total: z.number().int("Total harus berupa bilangan bulat").nonnegative("Total tidak boleh negatif").optional(),
    status: PenggajianStatusEnum.optional(),
});

export type UpdatePenggajianInput = z.infer<typeof UpdatePenggajianSchema>;

// Karyawan query schema
export const KaryawanQuerySchema = z.object({
    status: KaryawanStatusEnum.optional(),
    search: z.string().max(255).optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(50),
});

export type KaryawanQueryInput = z.infer<typeof KaryawanQuerySchema>;

// Validation helper for penggajian
export function validatePenggajianTotal(
    gajiPokok: number,
    tunjangan: number,
    potongan: number,
    total: number
): { valid: boolean; expectedTotal: number; error?: string } {
    const expectedTotal = gajiPokok + tunjangan - potongan;

    if (total !== expectedTotal) {
        return {
            valid: false,
            expectedTotal,
            error: `Total tidak sesuai. Expected: ${expectedTotal}, got: ${total}`,
        };
    }

    return { valid: true, expectedTotal };
}
