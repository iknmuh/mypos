// Re-export all validation schemas
export * from "./transaksi";
export * from "./produk";
export * from "./pembelian";
export * from "./hutang-piutang";
export * from "./jasa";
export * from "./karyawan";
export * from "./pengeluaran";

// Common validation helpers
import { z } from "zod";

// UUID validation helper
export const uuidSchema = z.string().uuid("ID tidak valid");

// Date range validation helper
export const dateRangeSchema = z.object({
    from: z.string().date("Format tanggal dari tidak valid"),
    to: z.string().date("Format tanggal sampai tidak valid"),
}).refine(
    (data) => new Date(data.from) <= new Date(data.to),
    { message: "Tanggal dari harus lebih kecil atau sama dengan tanggal sampai" }
);

// Pagination schema
export const paginationSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(50),
});

// Generic API response wrapper
export function apiResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
    return z.object({
        success: z.boolean(),
        data: dataSchema.optional(),
        error: z.string().optional(),
        code: z.string().optional(),
        details: z.record(z.string(), z.unknown()).optional(),
    });
}

// Parse and validate with error transformation
export function safeParse<T>(
    schema: z.ZodSchema<T>,
    data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
    const result = schema.safeParse(data);

    if (result.success) {
        return { success: true, data: result.data };
    }

    const errors = result.error.issues.map((issue) => {
        const path = issue.path.join(".");
        return path ? `${path}: ${issue.message}` : issue.message;
    });

    return { success: false, errors };
}
