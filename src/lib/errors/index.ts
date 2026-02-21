import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * Error codes for the application
 */
export enum ErrorCode {
    // Validation errors (4xx)
    VALIDATION_ERROR = "VALIDATION_ERROR",
    INVALID_INPUT = "INVALID_INPUT",
    MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",

    // Business logic errors (4xx)
    INSUFFICIENT_STOCK = "INSUFFICIENT_STOCK",
    PRODUCT_NOT_FOUND = "PRODUCT_NOT_FOUND",
    TRANSACTION_NOT_FOUND = "TRANSACTION_NOT_FOUND",
    PURCHASE_NOT_FOUND = "PURCHASE_NOT_FOUND",
    CUSTOMER_NOT_FOUND = "CUSTOMER_NOT_FOUND",
    SUPPLIER_NOT_FOUND = "SUPPLIER_NOT_FOUND",
    EMPLOYEE_NOT_FOUND = "EMPLOYEE_NOT_FOUND",
    SERVICE_NOT_FOUND = "SERVICE_NOT_FOUND",
    DEBT_NOT_FOUND = "DEBT_NOT_FOUND",

    // Payment errors
    PAYMENT_EXCEEDS_DEBT = "PAYMENT_EXCEEDS_DEBT",
    TRANSACTION_ALREADY_PAID = "TRANSACTION_ALREADY_PAID",
    TRANSACTION_VOIDED = "TRANSACTION_VOIDED",

    // Authorization errors (401, 403)
    UNAUTHORIZED = "UNAUTHORIZED",
    FORBIDDEN = "FORBIDDEN",
    INVALID_TOKEN = "INVALID_TOKEN",
    SESSION_EXPIRED = "SESSION_EXPIRED",

    // Rate limiting (429)
    RATE_LIMITED = "RATE_LIMITED",

    // System errors (5xx)
    DATABASE_ERROR = "DATABASE_ERROR",
    INTERNAL_ERROR = "INTERNAL_ERROR",
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
    AI_SERVICE_ERROR = "AI_SERVICE_ERROR",
}

/**
 * HTTP status code mapping
 */
const ErrorCodeToStatus: Record<ErrorCode, number> = {
    [ErrorCode.VALIDATION_ERROR]: 400,
    [ErrorCode.INVALID_INPUT]: 400,
    [ErrorCode.MISSING_REQUIRED_FIELD]: 400,
    [ErrorCode.INSUFFICIENT_STOCK]: 422,
    [ErrorCode.PRODUCT_NOT_FOUND]: 404,
    [ErrorCode.TRANSACTION_NOT_FOUND]: 404,
    [ErrorCode.PURCHASE_NOT_FOUND]: 404,
    [ErrorCode.CUSTOMER_NOT_FOUND]: 404,
    [ErrorCode.SUPPLIER_NOT_FOUND]: 404,
    [ErrorCode.EMPLOYEE_NOT_FOUND]: 404,
    [ErrorCode.SERVICE_NOT_FOUND]: 404,
    [ErrorCode.DEBT_NOT_FOUND]: 404,
    [ErrorCode.PAYMENT_EXCEEDS_DEBT]: 422,
    [ErrorCode.TRANSACTION_ALREADY_PAID]: 422,
    [ErrorCode.TRANSACTION_VOIDED]: 422,
    [ErrorCode.UNAUTHORIZED]: 401,
    [ErrorCode.FORBIDDEN]: 403,
    [ErrorCode.INVALID_TOKEN]: 401,
    [ErrorCode.SESSION_EXPIRED]: 401,
    [ErrorCode.RATE_LIMITED]: 429,
    [ErrorCode.DATABASE_ERROR]: 500,
    [ErrorCode.INTERNAL_ERROR]: 500,
    [ErrorCode.SERVICE_UNAVAILABLE]: 503,
    [ErrorCode.AI_SERVICE_ERROR]: 503,
};

/**
 * Custom application error class
 */
export class AppError extends Error {
    public readonly code: ErrorCode;
    public readonly statusCode: number;
    public readonly details?: Record<string, unknown>;
    public readonly isOperational: boolean;

    constructor(
        code: ErrorCode,
        message: string,
        details?: Record<string, unknown>,
        isOperational: boolean = true
    ) {
        super(message);
        this.name = "AppError";
        this.code = code;
        this.statusCode = ErrorCodeToStatus[code];
        this.details = details;
        this.isOperational = isOperational;

        // Ensure proper prototype chain
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

/**
 * Specific error classes for common cases
 */
export class ValidationError extends AppError {
    constructor(message: string, details?: Record<string, unknown>) {
        super(ErrorCode.VALIDATION_ERROR, message, details);
        this.name = "ValidationError";
    }
}

export class InsufficientStockError extends AppError {
    constructor(productName: string, requested: number, available: number) {
        super(
            ErrorCode.INSUFFICIENT_STOCK,
            `Stok ${productName} tidak mencukupi`,
            { productName, requested, available }
        );
        this.name = "InsufficientStockError";
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string, identifier?: string) {
        super(
            ErrorCode[`${resource.toUpperCase()}_NOT_FOUND` as ErrorCode] || ErrorCode.PRODUCT_NOT_FOUND,
            `${resource} tidak ditemukan${identifier ? `: ${identifier}` : ""}`,
            { resource, identifier }
        );
        this.name = "NotFoundError";
    }
}

export class UnauthorizedError extends AppError {
    constructor(message: string = "Tidak terautentikasi") {
        super(ErrorCode.UNAUTHORIZED, message);
        this.name = "UnauthorizedError";
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string = "Tidak memiliki akses") {
        super(ErrorCode.FORBIDDEN, message);
        this.name = "ForbiddenError";
    }
}

export class RateLimitedError extends AppError {
    constructor(retryAfter: number) {
        super(
            ErrorCode.RATE_LIMITED,
            "Terlalu banyak permintaan. Coba lagi nanti.",
            { retryAfter }
        );
        this.name = "RateLimitedError";
    }
}

export class DatabaseError extends AppError {
    constructor(message: string = "Terjadi kesalahan database", details?: Record<string, unknown>) {
        super(ErrorCode.DATABASE_ERROR, message, details, false);
        this.name = "DatabaseError";
    }
}

/**
 * API Response type
 */
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    code?: ErrorCode;
    details?: Record<string, unknown>;
}

/**
 * Error handler for API routes
 */
export function handleApiError(error: unknown): NextResponse<ApiResponse> {
    // Log error for debugging
    console.error("[API Error]", {
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
        } : error,
    });

    // Handle AppError
    if (error instanceof AppError) {
        return NextResponse.json(
            {
                success: false,
                error: error.message,
                code: error.code,
                details: error.details,
            },
            { status: error.statusCode }
        );
    }

    // Handle ZodError
    if (error instanceof ZodError) {
        const formattedErrors = error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
        }));

        return NextResponse.json(
            {
                success: false,
                error: "Data tidak valid",
                code: ErrorCode.VALIDATION_ERROR,
                details: { errors: formattedErrors },
            },
            { status: 400 }
        );
    }

    // Handle Response thrown from auth
    if (error instanceof Response) {
        return NextResponse.json(
            {
                success: false,
                error: "Tidak terautentikasi",
                code: ErrorCode.UNAUTHORIZED,
            },
            { status: 401 }
        );
    }

    // Handle generic Error
    if (error instanceof Error) {
        // Check for specific database errors
        if (error.message.includes("duplicate key")) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Data sudah ada",
                    code: ErrorCode.VALIDATION_ERROR,
                },
                { status: 400 }
            );
        }

        if (error.message.includes("foreign key")) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Data referensi tidak ditemukan",
                    code: ErrorCode.VALIDATION_ERROR,
                },
                { status: 400 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                error: "Terjadi kesalahan sistem",
                code: ErrorCode.INTERNAL_ERROR,
            },
            { status: 500 }
        );
    }

    // Unknown error type
    return NextResponse.json(
        {
            success: false,
            error: "Terjadi kesalahan yang tidak diketahui",
            code: ErrorCode.INTERNAL_ERROR,
        },
        { status: 500 }
    );
}

/**
 * Success response helper
 */
export function successResponse<T>(data: T, status: number = 200): NextResponse<ApiResponse<T>> {
    return NextResponse.json(
        {
            success: true,
            data,
        },
        { status }
    );
}

/**
 * Paginated response helper
 */
export interface PaginatedData<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export function paginatedResponse<T>(
    items: T[],
    total: number,
    page: number,
    limit: number
): NextResponse<ApiResponse<PaginatedData<T>>> {
    return NextResponse.json({
        success: true,
        data: {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    });
}
