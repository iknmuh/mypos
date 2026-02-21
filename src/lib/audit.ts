import { supabaseAdmin } from "@/lib/supabase";
import { getAuthInfo } from "./api";
import { DatabaseError } from "./errors";

/**
 * Audit action types
 */
export type AuditAction =
    | "CREATE"
    | "UPDATE"
    | "DELETE"
    | "VOID"
    | "LOGIN"
    | "LOGOUT"
    | "VIEW"
    | "EXPORT"
    | "IMPORT";

/**
 * Audit log entry interface
 */
export interface AuditLogEntry {
    id: string;
    store_id: string;
    user_id: string;
    action: AuditAction;
    table_name: string;
    record_id: string;
    old_values: Record<string, unknown> | null;
    new_values: Record<string, unknown> | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
}

/**
 * Input for creating an audit log entry
 */
export interface CreateAuditLogInput {
    action: AuditAction;
    tableName: string;
    recordId: string;
    oldValues?: Record<string, unknown> | null;
    newValues?: Record<string, unknown> | null;
    ipAddress?: string | null;
    userAgent?: string | null;
}

/**
 * Audit service for logging and querying audit trails
 */
export class AuditService {
    /**
     * Create an audit log entry
     */
    static async log(input: CreateAuditLogInput): Promise<AuditLogEntry | null> {
        try {
            const authInfo = await getAuthInfo();

            const { data, error } = await supabaseAdmin
                .from("audit_log")
                .insert({
                    store_id: authInfo.storeId,
                    user_id: authInfo.userId,
                    action: input.action,
                    table_name: input.tableName,
                    record_id: input.recordId,
                    old_values: input.oldValues ?? null,
                    new_values: input.newValues ?? null,
                    ip_address: input.ipAddress ?? null,
                    user_agent: input.userAgent ?? null,
                })
                .select()
                .single();

            if (error) {
                console.error("[Audit] Error creating audit log:", error);
                return null;
            }

            return data as AuditLogEntry;
        } catch (error) {
            // Don't throw on audit log failure - it shouldn't break the main operation
            console.error("[Audit] Error creating audit log:", error);
            return null;
        }
    }

    /**
     * Log a create action
     */
    static async logCreate(
        tableName: string,
        recordId: string,
        newValues: Record<string, unknown>
    ): Promise<AuditLogEntry | null> {
        return this.log({
            action: "CREATE",
            tableName,
            recordId,
            newValues,
        });
    }

    /**
     * Log an update action
     */
    static async logUpdate(
        tableName: string,
        recordId: string,
        oldValues: Record<string, unknown>,
        newValues: Record<string, unknown>
    ): Promise<AuditLogEntry | null> {
        return this.log({
            action: "UPDATE",
            tableName,
            recordId,
            oldValues,
            newValues,
        });
    }

    /**
     * Log a delete action
     */
    static async logDelete(
        tableName: string,
        recordId: string,
        oldValues: Record<string, unknown>
    ): Promise<AuditLogEntry | null> {
        return this.log({
            action: "DELETE",
            tableName,
            recordId,
            oldValues,
        });
    }

    /**
     * Log a void action (for transactions)
     */
    static async logVoid(
        tableName: string,
        recordId: string,
        oldValues: Record<string, unknown>,
        reason?: string
    ): Promise<AuditLogEntry | null> {
        return this.log({
            action: "VOID",
            tableName,
            recordId,
            oldValues,
            newValues: reason ? { reason } : undefined,
        });
    }

    /**
     * Get audit logs for a specific record
     */
    static async getRecordHistory(
        tableName: string,
        recordId: string
    ): Promise<AuditLogEntry[]> {
        const { data, error } = await supabaseAdmin
            .from("audit_log")
            .select("*")
            .eq("table_name", tableName)
            .eq("record_id", recordId)
            .order("created_at", { ascending: false });

        if (error) {
            throw new DatabaseError("Gagal mengambil riwayat audit");
        }

        return (data ?? []) as AuditLogEntry[];
    }

    /**
     * Get audit logs for a store with pagination
     */
    static async getStoreLogs(
        storeId: string,
        options: {
            tableName?: string;
            userId?: string;
            action?: AuditAction;
            from?: string;
            to?: string;
            page?: number;
            limit?: number;
        } = {}
    ): Promise<{ items: AuditLogEntry[]; total: number; page: number; limit: number }> {
        const { tableName, userId, action, from, to, page = 1, limit = 50 } = options;
        const offset = (page - 1) * limit;

        let query = supabaseAdmin
            .from("audit_log")
            .select("*", { count: "exact" })
            .eq("store_id", storeId)
            .order("created_at", { ascending: false });

        if (tableName) {
            query = query.eq("table_name", tableName);
        }
        if (userId) {
            query = query.eq("user_id", userId);
        }
        if (action) {
            query = query.eq("action", action);
        }
        if (from) {
            query = query.gte("created_at", from);
        }
        if (to) {
            query = query.lte("created_at", `${to}T23:59:59`);
        }

        const { data, error, count } = await query.range(offset, offset + limit - 1);

        if (error) {
            throw new DatabaseError("Gagal mengambil log audit");
        }

        return {
            items: (data ?? []) as AuditLogEntry[],
            total: count ?? 0,
            page,
            limit,
        };
    }

    /**
     * Get recent activity for a store
     */
    static async getRecentActivity(
        storeId: string,
        limit: number = 20
    ): Promise<AuditLogEntry[]> {
        const { data, error } = await supabaseAdmin
            .from("audit_log")
            .select("*")
            .eq("store_id", storeId)
            .order("created_at", { ascending: false })
            .limit(limit);

        if (error) {
            throw new DatabaseError("Gagal mengambil aktivitas terbaru");
        }

        return (data ?? []) as AuditLogEntry[];
    }
}

/**
 * Table names for audit logging
 */
export const AuditTables = {
    TRANSAKSI: "transaksi",
    TRANSAKSI_ITEM: "transaksi_item",
    PRODUK: "produk",
    STOK_ADJUSTMENT: "stok_adjustment",
    PEMBELIAN: "pembelian",
    PEMBELIAN_ITEM: "pembelian_item",
    HUTANG_PIUTANG: "hutang_piutang",
    PEMBAYARAN_HP: "pembayaran_hp",
    JASA: "jasa",
    KARYAWAN: "karyawan",
    PENGGAIAN: "penggajian",
    PENGELUARAN: "pengeluaran",
    PELANGGAN: "pelanggan",
    SUPPLIER: "supplier",
    INVENTARIS: "inventaris",
    KATEGORI_PRODUK: "kategori_produk",
    PENGGUNA_TOKO: "pengguna_toko",
    PENGATURAN_TOKO: "pengaturan_toko",
} as const;

/**
 * Helper to extract request metadata for audit logging
 */
export function extractRequestMetadata(request: Request): {
    ipAddress: string | null;
    userAgent: string | null;
} {
    const forwarded = request.headers.get("x-forwarded-for");
    const ipAddress = forwarded ? forwarded.split(",")[0].trim() : null;
    const userAgent = request.headers.get("user-agent");

    return { ipAddress, userAgent };
}
