import { z } from "zod";

// Hutang/Piutang type enum
export const HutangPiutangTypeEnum = z.enum(["hutang", "piutang"]);
export type HutangPiutangType = z.infer<typeof HutangPiutangTypeEnum>;

// Hutang/Piutang status enum
export const HutangPiutangStatusEnum = z.enum(["belum_lunas", "lunas"]);
export type HutangPiutangStatus = z.infer<typeof HutangPiutangStatusEnum>;

// Create hutang/piutang schema
export const CreateHutangPiutangSchema = z.object({
    tipe: HutangPiutangTypeEnum,
    nama: z.string().min(1, "Nama wajib diisi").max(255, "Nama terlalu panjang"),
    deskripsi: z.string().max(500, "Deskripsi terlalu panjang").optional().nullable(),
    jumlah: z.number().int("Jumlah harus berupa bilangan bulat").positive("Jumlah harus lebih dari 0"),
    jatuh_tempo: z.string().date("Format tanggal jatuh tempo tidak valid").optional().nullable(),
    status: HutangPiutangStatusEnum.default("belum_lunas"),
});

export type CreateHutangPiutangInput = z.infer<typeof CreateHutangPiutangSchema>;

// Update hutang/piutang schema
export const UpdateHutangPiutangSchema = z.object({
    nama: z.string().min(1, "Nama wajib diisi").max(255, "Nama terlalu panjang").optional(),
    deskripsi: z.string().max(500, "Deskripsi terlalu panjang").optional().nullable(),
    jatuh_tempo: z.string().date("Format tanggal jatuh tempo tidak valid").optional().nullable(),
    status: HutangPiutangStatusEnum.optional(),
});

export type UpdateHutangPiutangInput = z.infer<typeof UpdateHutangPiutangSchema>;

// Payment schema for hutang/piutang
export const PembayaranHPSchema = z.object({
    hutang_id: z.string().uuid("ID hutang/piutang tidak valid"),
    jumlah: z.number().int("Jumlah harus berupa bilangan bulat").positive("Jumlah harus lebih dari 0"),
    catatan: z.string().max(500, "Catatan terlalu panjang").optional().nullable(),
});

export type PembayaranHPInput = z.infer<typeof PembayaranHPSchema>;

// Hutang/Piutang query schema
export const HutangPiutangQuerySchema = z.object({
    tipe: HutangPiutangTypeEnum.optional(),
    status: HutangPiutangStatusEnum.optional(),
    jatuh_tempo_from: z.string().date("Format tanggal tidak valid").optional(),
    jatuh_tempo_to: z.string().date("Format tanggal tidak valid").optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(50),
});

export type HutangPiutangQueryInput = z.infer<typeof HutangPiutangQuerySchema>;

// Validation helper for payment
export function validatePembayaranHP(
    currentSisa: number,
    paymentAmount: number
): { valid: boolean; newSisa: number; error?: string } {
    if (paymentAmount > currentSisa) {
        return {
            valid: false,
            newSisa: currentSisa,
            error: `Jumlah pembayaran melebihi sisa ${currentSisa > 0 ? 'hutang/piutang' : ''}. Sisa: ${currentSisa}, dibayar: ${paymentAmount}`,
        };
    }

    const newSisa = currentSisa - paymentAmount;

    return { valid: true, newSisa };
}
