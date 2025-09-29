interface CachedData<T> {
  data: T;
  timestamp: number;
  version: string;
}

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category?: string;
  sku?: string;
  description?: string;
}

class ProductCache {
  private memoryCache = new Map<string, Product[]>();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
  private readonly CACHE_VERSION = '1.0.0'; // Increment when cache structure changes

  /**
   * Get tenant-specific cache key
   */
  private getCacheKey(tenantId?: string): string {
    return tenantId ? `products_cache_${tenantId}` : 'products_cache';
  }

  /**
   * Get products from cache or fetch from API
   */
  async getProducts(fetchFunction: () => Promise<Product[]>, tenantId?: string): Promise<Product[]> {
    const cacheKey = this.getCacheKey(tenantId);

    // Check memory cache first
    if (this.memoryCache.has(cacheKey)) {
      console.log('📦 Serving products from memory cache');
      return this.memoryCache.get(cacheKey)!;
    }

    // Check localStorage cache
    const cached = this.getFromLocalStorage(tenantId);
    if (cached && this.isValidCache(cached)) {
      console.log('📦 Serving products from localStorage cache');
      this.memoryCache.set(cacheKey, cached.data);
      return cached.data;
    }

    // Fetch from API
    console.log('🌐 Fetching products from API');
    try {
      const products = await fetchFunction();

      // Cache the results
      this.setCache(products, tenantId);

      return products;
    } catch (error) {
      // If API fails and we have stale cache, use it
      if (cached) {
        console.warn('⚠️ API failed, using stale cache');
        this.memoryCache.set(cacheKey, cached.data);
        return cached.data;
      }
      throw error;
    }
  }

  /**
   * Update a specific product in cache
   */
  updateProduct(productId: string, updates: Partial<Product>, tenantId?: string): void {
    const cacheKey = this.getCacheKey(tenantId);
    const products = this.memoryCache.get(cacheKey);
    if (!products) return;

    const index = products.findIndex(p => p.id === productId);
    if (index !== -1) {
      products[index] = { ...products[index], ...updates };
      this.memoryCache.set(cacheKey, [...products]);
      this.saveToLocalStorage(products, tenantId);
      console.log(`📝 Updated product ${productId} in cache`);
    }
  }

  /**
   * Update multiple products in cache
   */
  updateProducts(updates: Array<{ id: string; updates: Partial<Product> }>, tenantId?: string): void {
    const cacheKey = this.getCacheKey(tenantId);
    const products = this.memoryCache.get(cacheKey);
    if (!products) return;

    let hasChanges = false;
    updates.forEach(({ id, updates: productUpdates }) => {
      const index = products.findIndex(p => p.id === id);
      if (index !== -1) {
        products[index] = { ...products[index], ...productUpdates };
        hasChanges = true;
      }
    });

    if (hasChanges) {
      this.memoryCache.set(cacheKey, [...products]);
      this.saveToLocalStorage(products, tenantId);
      console.log(`📝 Updated ${updates.length} products in cache`);
    }
  }

  /**
   * Invalidate cache for a specific tenant or all cache
   */
  invalidateCache(tenantId?: string): void {
    if (tenantId) {
      // Invalidate specific tenant cache
      const cacheKey = this.getCacheKey(tenantId);
      this.memoryCache.delete(cacheKey);
      localStorage.removeItem(cacheKey);
      console.log(`🗑️ Cache invalidated for tenant ${tenantId}`);
    } else {
      // Invalidate all cache
      this.memoryCache.clear();
      // Clear all product cache keys from localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('products_cache')) {
          localStorage.removeItem(key);
        }
      });
      console.log('🗑️ All product cache invalidated');
    }
  }

  /**
   * Check if cache is still valid
   */
  private isValidCache(cached: CachedData<Product[]>): boolean {
    const now = Date.now();
    const isExpired = now - cached.timestamp > this.CACHE_DURATION;
    const isValidVersion = cached.version === this.CACHE_VERSION;

    return !isExpired && isValidVersion;
  }

  /**
   * Get cached data from localStorage
   */
  private getFromLocalStorage(tenantId?: string): CachedData<Product[]> | null {
    try {
      const cacheKey = this.getCacheKey(tenantId);
      const cached = localStorage.getItem(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
      return null;
    }
  }

  /**
   * Save data to both memory and localStorage
   */
  private setCache(products: Product[], tenantId?: string): void {
    const cacheKey = this.getCacheKey(tenantId);
    this.memoryCache.set(cacheKey, products);
    this.saveToLocalStorage(products, tenantId);
  }

  /**
   * Save to localStorage
   */
  private saveToLocalStorage(products: Product[], tenantId?: string): void {
    try {
      const cacheKey = this.getCacheKey(tenantId);
      const cachedData: CachedData<Product[]> = {
        data: products,
        timestamp: Date.now(),
        version: this.CACHE_VERSION
      };
      localStorage.setItem(cacheKey, JSON.stringify(cachedData));
    } catch (error: unknown) {
      console.warn('Failed to save to localStorage:', error);
      // If localStorage is full, clear it and try again
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        localStorage.clear();
        try {
          const cacheKey = this.getCacheKey(tenantId);
          const cachedData: CachedData<Product[]> = {
            data: products,
            timestamp: Date.now(),
            version: this.CACHE_VERSION
          };
          localStorage.setItem(cacheKey, JSON.stringify(cachedData));
        } catch (retryError: unknown) {
          console.error('Failed to save to localStorage even after clearing:', retryError);
        }
      }
    }
  }

  /**
   * Get cache statistics for a specific tenant
   */
  getCacheStats(tenantId?: string): {
    memoryCached: boolean;
    localStorageCached: boolean;
    cacheAge?: number;
    productCount?: number;
  } {
    const cacheKey = this.getCacheKey(tenantId);
    const memoryCached = this.memoryCache.has(cacheKey);
    const localStorageCached = !!this.getFromLocalStorage(tenantId);

    let cacheAge: number | undefined;
    let productCount: number | undefined;

    if (memoryCached) {
      productCount = this.memoryCache.get(cacheKey)!.length;
    }

    const lsCache = this.getFromLocalStorage(tenantId);
    if (lsCache) {
      cacheAge = Date.now() - lsCache.timestamp;
    }

    return {
      memoryCached,
      localStorageCached,
      cacheAge,
      productCount
    };
  }

  /**
   * Preload products in background
   */
  async preloadProducts(fetchFunction: () => Promise<Product[]>, tenantId?: string): Promise<void> {
    try {
      const products = await fetchFunction();
      this.setCache(products, tenantId);
      console.log('🔄 Products preloaded in cache');
    } catch (error) {
      console.warn('Failed to preload products:', error);
    }
  }
}

// Export singleton instance
export const productCache = new ProductCache();
export type { Product };
