import { auth } from "@clerk/nextjs/server";
import { NextResponse, NextRequest } from "next/server";
import { handleApiError, UnauthorizedError, ApiResponse } from "./errors";

/**
 * Gets the store_id for the current user.
 * Multi-store: prefers orgId (branch). Falls back to userId (personal store).
 */
export async function getStoreId(): Promise<string> {
    const { userId, orgId } = await auth();
    if (!userId) {
        throw new UnauthorizedError("Silakan login terlebih dahulu");
    }
    return orgId ?? userId;
}

/**
 * Gets the current user's ID from Clerk auth.
 */
export async function getUserId(): Promise<string> {
    const { userId } = await auth();
    if (!userId) {
        throw new UnauthorizedError("Silakan login terlebih dahulu");
    }
    return userId;
}

/**
 * Gets auth info including user ID, org ID, and store ID.
 */
export async function getAuthInfo(): Promise<{
    userId: string;
    orgId: string | null;
    storeId: string;
}> {
    const { userId, orgId } = await auth();
    if (!userId) {
        throw new UnauthorizedError("Silakan login terlebih dahulu");
    }
    return {
        userId,
        orgId: orgId ?? null,
        storeId: orgId ?? userId,
    };
}

/**
 * Wrap a route handler with error handling.
 * Catches all errors and returns appropriate responses.
 */
export function apiRoute(
    handler: () => Promise<NextResponse>
): Promise<NextResponse> {
    return handler().catch(handleApiError);
}

/**
 * Wrap a route handler with request parameter.
 */
export function apiRouteWithRequest(
    handler: (req: NextRequest) => Promise<NextResponse>
): (req: NextRequest) => Promise<NextResponse> {
    return (req: NextRequest) => handler(req).catch(handleApiError);
}

/**
 * Wrap a route handler with params.
 */
export function apiRouteWithParams<P extends Record<string, string>>(
    handler: (req: NextRequest, params: P) => Promise<NextResponse>
): (req: NextRequest, context: { params: Promise<P> }) => Promise<NextResponse> {
    return async (req: NextRequest, context: { params: Promise<P> }) => {
        try {
            const params = await context.params;
            return handler(req, params);
        } catch (error) {
            return handleApiError(error);
        }
    };
}
