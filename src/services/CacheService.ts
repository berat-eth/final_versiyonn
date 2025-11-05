import AsyncStorage from '@react-native-async-storage/async-storage';

type JsonValue = any;

interface CacheEntry<T = JsonValue> {
  v: T;
  e: number; // expiry epoch ms
}

export class CacheService {
  static async get<T = JsonValue>(key: string): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return null;
      const parsed: CacheEntry<T> = JSON.parse(raw);
      if (!parsed || typeof parsed.e !== 'number') return null;
      if (Date.now() > parsed.e) {
        // expired, remove
        AsyncStorage.removeItem(key).catch(() => {});
        return null;
      }
      return parsed.v;
    } catch {
      return null;
    }
  }

  static async set<T = JsonValue>(key: string, value: T, ttlMs: number): Promise<void> {
    const entry: CacheEntry<T> = { v: value, e: Date.now() + Math.max(0, ttlMs) };
    try {
      await AsyncStorage.setItem(key, JSON.stringify(entry));
    } catch {}
  }

  static async del(key: string): Promise<void> {
    try { await AsyncStorage.removeItem(key); } catch {}
  }

  static async remove(key: string): Promise<void> {
    return this.del(key);
  }

  static async clearPattern(pattern: string): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const matchingKeys = keys.filter(k => k.includes(pattern));
      if (matchingKeys.length > 0) {
        await AsyncStorage.multiRemove(matchingKeys);
      }
    } catch {}
  }

  static async withCache<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
    const cached = await CacheService.get<T>(key);
    if (cached !== null && cached !== undefined) return cached as T;
    const fresh = await fetcher();
    // Do not cache null/undefined to avoid poisoning
    if (fresh !== undefined && fresh !== null) {
      CacheService.set(key, fresh as any, ttlMs).catch(() => {});
    }
    return fresh;
  }
}

export const CacheTTL = {
  SHORT: 3 * 60 * 1000,          // 3 minutes (1 → 3)
  MEDIUM: 10 * 60 * 1000,     // 5 minutes
  LONG: 30 * 60 * 1000,      // 30 minutes
  XLONG: 2 * 60 * 60 * 1000, // 2 hours
};


