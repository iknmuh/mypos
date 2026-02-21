import { Redis } from "@upstash/redis";

// Cache TTL constants (in seconds)
export const CacheTTL = {
    SHORT: 60,          // 1 minute - for frequently changing data
    MEDIUM: 300,        // 5 minutes - for moderately changing data
    LONG: 900,          // 15 minutes - for relatively stable data
    HOUR: 3600,         // 1 hour - for stable data
    DAY: 86400,         // 1 day - for rarely changing data
} as const;

// Cache key prefixes for different data types
export const CacheKeys = {
    // Dashboard
    dashboard: (storeId: string) => `dashboard:${storeId}`,

    // Products
    products: (storeId: string) => `products:${storeId}`,
    product: (id: string) => `product:${id}`,
    lowStock: (storeId: string) => `lowstock:${storeId}`,

    // Transactions
    transactions: (storeId: string, page: number) => `transactions:${storeId}:${page}`,
    transaction: (id: string) => `transaction:${id}`,

    // Purchases
    purchases: (storeId: string) => `purchases:${storeId}`,
    purchase: (id: string) => `purchase:${id}`,

    // Reports
    salesReport: (storeId: string, from: string, to: string) => `report:sales:${storeId}:${from}:${to}`,
    productReport: (storeId: string, from: string, to: string) => `report:product:${storeId}:${from}:${to}`,
    financialReport: (storeId: string, from: string, to: string) => `report:financial:${storeId}:${from}:${to}`,

    // Master data
    categories: (storeId: string) => `categories:${storeId}`,
    suppliers: (storeId: string) => `suppliers:${storeId}`,
    customers: (storeId: string) => `customers:${storeId}`,
    employees: (storeId: string) => `employees:${storeId}`,

    // Settings
    settings: (storeId: string) => `settings:${storeId}`,
} as const;

// Singleton Redis client
let redisClient: Redis | null = null;

/**
 * Get Redis client instance
 * Returns null if Redis is not configured
 */
function getRedisClient(): Redis | null {
    if (redisClient) return redisClient;

    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
        console.warn("[Cache] Upstash Redis credentials not configured. Caching is disabled.");
        return null;
    }

    redisClient = new Redis({ url, token });
    return redisClient;
}

/**
 * Cache service for storing and retrieving data
 */
export class CacheService {
    /**
     * Get a value from cache
     */
    static async get<T>(key: string): Promise<T | null> {
        const client = getRedisClient();
        if (!client) return null;

        try {
            const cached = await client.get<T>(key);
            return cached;
        } catch (error) {
            console.error("[Cache] Error getting key:", key, error);
            return null;
        }
    }

    /**
     * Set a value in cache with optional TTL
     */
    static async set(key: string, value: unknown, ttl: number = CacheTTL.MEDIUM): Promise<boolean> {
        const client = getRedisClient();
        if (!client) return false;

        try {
            await client.set(key, JSON.stringify(value), { ex: ttl });
            return true;
        } catch (error) {
            console.error("[Cache] Error setting key:", key, error);
            return false;
        }
    }

    /**
     * Delete a key from cache
     */
    static async delete(key: string): Promise<boolean> {
        const client = getRedisClient();
        if (!client) return false;

        try {
            await client.del(key);
            return true;
        } catch (error) {
            console.error("[Cache] Error deleting key:", key, error);
            return false;
        }
    }

    /**
     * Delete multiple keys matching a pattern
     */
    static async deletePattern(pattern: string): Promise<number> {
        const client = getRedisClient();
        if (!client) return 0;

        try {
            // Scan for keys matching the pattern
            const keys: string[] = [];
            let cursor: string = "0";

            do {
                const result = await client.scan(cursor, { match: pattern, count: 100 });
                cursor = result[0];
                keys.push(...result[1]);
            } while (cursor !== "0");

            if (keys.length > 0) {
                await client.del(...keys);
            }

            return keys.length;
        } catch (error) {
            console.error("[Cache] Error deleting pattern:", pattern, error);
            return 0;
        }
    }

    /**
     * Invalidate all cache for a store
     */
    static async invalidateStore(storeId: string): Promise<number> {
        return this.deletePattern(`*:${storeId}*`);
    }

    /**
     * Get or set a value with a factory function
     * If the value is not in cache, it will be fetched using the factory function
     */
    static async getOrSet<T>(
        key: string,
        factory: () => Promise<T>,
        ttl: number = CacheTTL.MEDIUM
    ): Promise<T> {
        // Try to get from cache first
        const cached = await this.get<T>(key);
        if (cached !== null) {
            return cached;
        }

        // Fetch fresh data
        const data = await factory();

        // Store in cache
        await this.set(key, data, ttl);

        return data;
    }

    /**
     * Check if a key exists in cache
     */
    static async exists(key: string): Promise<boolean> {
        const client = getRedisClient();
        if (!client) return false;

        try {
            const result = await client.exists(key);
            return result === 1;
        } catch (error) {
            console.error("[Cache] Error checking key:", key, error);
            return false;
        }
    }

    /**
     * Get remaining TTL for a key
     */
    static async getTTL(key: string): Promise<number> {
        const client = getRedisClient();
        if (!client) return -1;

        try {
            return await client.ttl(key);
        } catch (error) {
            console.error("[Cache] Error getting TTL for key:", key, error);
            return -1;
        }
    }
}

/**
 * Cache invalidation helpers for specific data types
 */
export const CacheInvalidation = {
    /**
     * Invalidate product-related caches
     */
    async product(storeId: string, productId?: string): Promise<void> {
        const promises: Promise<unknown>[] = [
            CacheService.deletePattern(`products:${storeId}*`),
            CacheService.deletePattern(`lowstock:${storeId}*`),
            CacheService.deletePattern(`report:product:${storeId}*`),
        ];

        if (productId) {
            promises.push(CacheService.delete(`product:${productId}`));
        }

        await Promise.all(promises);
    },

    /**
     * Invalidate transaction-related caches
     */
    async transaction(storeId: string, transactionId?: string): Promise<void> {
        const promises: Promise<unknown>[] = [
            CacheService.deletePattern(`transactions:${storeId}*`),
            CacheService.deletePattern(`dashboard:${storeId}*`),
            CacheService.deletePattern(`report:sales:${storeId}*`),
            CacheService.deletePattern(`report:financial:${storeId}*`),
        ];

        if (transactionId) {
            promises.push(CacheService.delete(`transaction:${transactionId}`));
        }

        await Promise.all(promises);
    },

    /**
     * Invalidate purchase-related caches
     */
    async purchase(storeId: string, purchaseId?: string): Promise<void> {
        const promises: Promise<unknown>[] = [
            CacheService.deletePattern(`purchases:${storeId}*`),
            CacheService.deletePattern(`lowstock:${storeId}*`),
            CacheService.deletePattern(`products:${storeId}*`),
        ];

        if (purchaseId) {
            promises.push(CacheService.delete(`purchase:${purchaseId}`));
        }

        await Promise.all(promises);
    },

    /**
     * Invalidate dashboard cache
     */
    async dashboard(storeId: string): Promise<void> {
        await CacheService.delete(`dashboard:${storeId}`);
    },

    /**
     * Invalidate all report caches for a store
     */
    async reports(storeId: string): Promise<void> {
        await CacheService.deletePattern(`report:*:${storeId}*`);
    },

    /**
     * Invalidate settings cache
     */
    async settings(storeId: string): Promise<void> {
        await CacheService.delete(`settings:${storeId}`);
    },
};

/**
 * Decorator for caching method results
 */
export function Cached(key: string, ttl: number = CacheTTL.MEDIUM) {
    return function (
        _target: unknown,
        _propertyKey: string,
        descriptor: TypedPropertyDescriptor<(...args: unknown[]) => Promise<unknown>>
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: unknown[]) {
            const cacheKey = `${key}:${JSON.stringify(args)}`;
            return CacheService.getOrSet(cacheKey, () => originalMethod!.apply(this, args), ttl);
        };

        return descriptor;
    };
}
