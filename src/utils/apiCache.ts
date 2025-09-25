interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // Time to live in milliseconds
}

class APICache {
  private cache = new Map<string, CacheEntry<any>>()
  
  // Default TTL values for different data types
  private readonly TTL = {
    STOCK_DATA: 15 * 60 * 1000,     // 15 minutes for stock data (stable for trading decisions)
    PREMARKET_SCAN: 1 * 60 * 1000,  // 1 minute for premarket scans (very fresh for momentum)
    FUNDAMENTALS: 4 * 60 * 60 * 1000, // 4 hours for fundamentals (shorter refresh)
    SCREENER: 30 * 1000,            // 30 seconds for screener results (very fresh)
    MARKET_STATUS: 15 * 1000,       // 15 seconds for market status (fresher)
    NEWS: 2 * 60 * 1000,            // 2 minutes for news data
    REALTIME: 30 * 1000,            // 30 seconds for real-time premarket data
  }

  set<T>(key: string, data: T, type: keyof typeof this.TTL = 'STOCK_DATA'): void {
    const ttl = this.TTL[type]
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  has(key: string): boolean {
    return this.get(key) !== null
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // Clean expired entries
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  // Get cache stats
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

// Global cache instance
export const apiCache = new APICache()

// Cleanup expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    apiCache.cleanup()
  }, 5 * 60 * 1000)
}
