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
  private readonly CACHE_KEY = 'products_cache';
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
  private readonly CACHE_VERSION = '1.0.0'; // Increment when cache structure changes

  /**
   * Get products from cache or fetch from API
   */
  async getProducts(fetchFunction: () => Promise<Product[]>): Promise<Product[]> {
    // Check memory cache first
    if (this.memoryCache.has('products')) {
      console.log('📦 Serving products from memory cache');
      return this.memoryCache.get('products')!;
    }

    // Check localStorage cache
    const cached = this.getFromLocalStorage();
    if (cached && this.isValidCache(cached)) {
      console.log('📦 Serving products from localStorage cache');
      this.memoryCache.set('products', cached.data);
      return cached.data;
    }

    // Fetch from API
    console.log('🌐 Fetching products from API');
    try {
      const products = await fetchFunction();

      // Cache the results
      this.setCache(products);

      return products;
    } catch (error) {
      // If API fails and we have stale cache, use it
      if (cached) {
        console.warn('⚠️ API failed, using stale cache');
        this.memoryCache.set('products', cached.data);
        return cached.data;
      }
      throw error;
    }
  }

  /**
   * Update a specific product in cache
   */
  updateProduct(productId: string, updates: Partial<Product>): void {
    const products = this.memoryCache.get('products');
    if (!products) return;

    const index = products.findIndex(p => p.id === productId);
    if (index !== -1) {
      products[index] = { ...products[index], ...updates };
      this.memoryCache.set('products', [...products]);
      this.saveToLocalStorage(products);
      console.log(`📝 Updated product ${productId} in cache`);
    }
  }

  /**
   * Update multiple products in cache
   */
  updateProducts(updates: Array<{ id: string; updates: Partial<Product> }>): void {
    const products = this.memoryCache.get('products');
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
      this.memoryCache.set('products', [...products]);
      this.saveToLocalStorage(products);
      console.log(`📝 Updated ${updates.length} products in cache`);
    }
  }

  /**
   * Invalidate the entire cache
   */
  invalidateCache(): void {
    this.memoryCache.clear();
    localStorage.removeItem(this.CACHE_KEY);
    console.log('🗑️ Cache invalidated');
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
  private getFromLocalStorage(): CachedData<Product[]> | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
      return null;
    }
  }

  /**
   * Save data to both memory and localStorage
   */
  private setCache(products: Product[]): void {
    this.memoryCache.set('products', products);
    this.saveToLocalStorage(products);
  }

  /**
   * Save to localStorage
   */
  private saveToLocalStorage(products: Product[]): void {
    try {
      const cachedData: CachedData<Product[]> = {
        data: products,
        timestamp: Date.now(),
        version: this.CACHE_VERSION
      };
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cachedData));
    } catch (error: unknown) {
      console.warn('Failed to save to localStorage:', error);
      // If localStorage is full, clear it and try again
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        localStorage.clear();
        try {
          const cachedData: CachedData<Product[]> = {
            data: products,
            timestamp: Date.now(),
            version: this.CACHE_VERSION
          };
          localStorage.setItem(this.CACHE_KEY, JSON.stringify(cachedData));
        } catch (retryError: unknown) {
          console.error('Failed to save to localStorage even after clearing:', retryError);
        }
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    memoryCached: boolean;
    localStorageCached: boolean;
    cacheAge?: number;
    productCount?: number;
  } {
    const memoryCached = this.memoryCache.has('products');
    const localStorageCached = !!this.getFromLocalStorage();

    let cacheAge: number | undefined;
    let productCount: number | undefined;

    if (memoryCached) {
      productCount = this.memoryCache.get('products')!.length;
    }

    const lsCache = this.getFromLocalStorage();
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
  async preloadProducts(fetchFunction: () => Promise<Product[]>): Promise<void> {
    try {
      const products = await fetchFunction();
      this.setCache(products);
      console.log('🔄 Products preloaded in cache');
    } catch (error) {
      console.warn('Failed to preload products:', error);
    }
  }
}

// Export singleton instance
export const productCache = new ProductCache();
export type { Product };
