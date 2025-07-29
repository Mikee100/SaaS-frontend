// Offline Storage Utility for SaaS Platform
// Manages local data storage, sync queues, and offline-first functionality

interface OfflineOperation {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  endpoint: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

interface CachedData {
  key: string;
  data: any;
  timestamp: number;
  expiresAt?: number;
}

class OfflineStorage {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'SaaSPlatformDB';
  private readonly DB_VERSION = 1;

  // Initialize IndexedDB
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('offlineOperations')) {
          const operationsStore = db.createObjectStore('offlineOperations', { keyPath: 'id' });
          operationsStore.createIndex('timestamp', 'timestamp', { unique: false });
          operationsStore.createIndex('type', 'type', { unique: false });
        }

        if (!db.objectStoreNames.contains('cachedData')) {
          const cacheStore = db.createObjectStore('cachedData', { keyPath: 'key' });
          cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('products')) {
          db.createObjectStore('products', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('customers')) {
          db.createObjectStore('customers', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('sales')) {
          db.createObjectStore('sales', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('analytics')) {
          db.createObjectStore('analytics', { keyPath: 'key' });
        }
      };
    });
  }

  // Store data locally
  async storeData(storeName: string, data: any): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get data from local storage
  async getData(storeName: string, key?: string): Promise<any> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);

      const request = key ? store.get(key) : store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Delete data from local storage
  async deleteData(storeName: string, key: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Add operation to sync queue
  async addOfflineOperation(operation: Omit<OfflineOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const fullOperation: OfflineOperation = {
      ...operation,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retryCount: 0
    };

    await this.storeData('offlineOperations', fullOperation);
  }

  // Get all offline operations
  async getOfflineOperations(): Promise<OfflineOperation[]> {
    return await this.getData('offlineOperations') || [];
  }

  // Remove operation from sync queue
  async removeOfflineOperation(id: string): Promise<void> {
    await this.deleteData('offlineOperations', id);
  }

  // Cache API response
  async cacheApiResponse(key: string, data: any, expiresIn?: number): Promise<void> {
    const cachedData: CachedData = {
      key,
      data,
      timestamp: Date.now(),
      expiresAt: expiresIn ? Date.now() + expiresIn : undefined
    };

    await this.storeData('cachedData', cachedData);
  }

  // Get cached API response
  async getCachedResponse(key: string): Promise<any | null> {
    const cachedData: CachedData = await this.getData('cachedData', key);
    
    if (!cachedData) return null;

    // Check if data has expired
    if (cachedData.expiresAt && Date.now() > cachedData.expiresAt) {
      await this.deleteData('cachedData', key);
      return null;
    }

    return cachedData.data;
  }

  // Clear expired cache
  async clearExpiredCache(): Promise<void> {
    const allCachedData: CachedData[] = await this.getData('cachedData');
    const now = Date.now();

    for (const cached of allCachedData) {
      if (cached.expiresAt && now > cached.expiresAt) {
        await this.deleteData('cachedData', cached.key);
      }
    }
  }

  // Sync offline operations with server
  async syncOfflineOperations(): Promise<void> {
    const operations = await this.getOfflineOperations();
    
    for (const operation of operations) {
      try {
        const response = await fetch(operation.endpoint, {
          method: operation.type === 'CREATE' ? 'POST' : 
                  operation.type === 'UPDATE' ? 'PUT' : 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: operation.type !== 'DELETE' ? JSON.stringify(operation.data) : undefined
        });

        if (response.ok) {
          await this.removeOfflineOperation(operation.id);
          console.log('Synced operation:', operation.id);
        } else {
          // Increment retry count
          operation.retryCount++;
          if (operation.retryCount < 3) {
            await this.storeData('offlineOperations', operation);
          } else {
            await this.removeOfflineOperation(operation.id);
            console.error('Failed to sync operation after 3 retries:', operation);
          }
        }
      } catch (error) {
        console.error('Error syncing operation:', operation.id, error);
        operation.retryCount++;
        if (operation.retryCount < 3) {
          await this.storeData('offlineOperations', operation);
        } else {
          await this.removeOfflineOperation(operation.id);
        }
      }
    }
  }

  // Check if we're online
  isOnline(): boolean {
    return navigator.onLine;
  }

  // Get storage usage info
  async getStorageInfo(): Promise<{ used: number; available: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        available: estimate.quota || 0
      };
    }
    return { used: 0, available: 0 };
  }

  // Clear all offline data
  async clearAllData(): Promise<void> {
    if (!this.db) return;

    const storeNames = ['offlineOperations', 'cachedData', 'products', 'customers', 'sales', 'analytics'];
    
    for (const storeName of storeNames) {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }
}

// Create singleton instance
const offlineStorage = new OfflineStorage();

// Initialize on module load
offlineStorage.init().catch(console.error);

export default offlineStorage;

// Utility functions for common operations
export const offlineUtils = {
  // Store products locally
  async storeProducts(products: any[]): Promise<void> {
    for (const product of products) {
      await offlineStorage.storeData('products', product);
    }
  },

  // Get products from local storage
  async getProducts(): Promise<any[]> {
    return await offlineStorage.getData('products') || [];
  },

  // Store customers locally
  async storeCustomers(customers: any[]): Promise<void> {
    for (const customer of customers) {
      await offlineStorage.storeData('customers', customer);
    }
  },

  // Get customers from local storage
  async getCustomers(): Promise<any[]> {
    return await offlineStorage.getData('customers') || [];
  },

  // Store sales locally
  async storeSales(sales: any[]): Promise<void> {
    for (const sale of sales) {
      await offlineStorage.storeData('sales', sale);
    }
  },

  // Get sales from local storage
  async getSales(): Promise<any[]> {
    return await offlineStorage.getData('sales') || [];
  },

  // Store analytics data
  async storeAnalytics(key: string, data: any): Promise<void> {
    await offlineStorage.storeData('analytics', { key, data, timestamp: Date.now() });
  },

  // Get analytics data
  async getAnalytics(key: string): Promise<any> {
    const result = await offlineStorage.getData('analytics', key);
    return result?.data || null;
  },

  // Queue offline operation
  async queueOperation(type: 'CREATE' | 'UPDATE' | 'DELETE', endpoint: string, data?: any): Promise<void> {
    await offlineStorage.addOfflineOperation({ type, endpoint, data });
  },

  // Check if data is available offline
  async isDataAvailableOffline(dataType: string): Promise<boolean> {
    const data = await offlineStorage.getData(dataType);
    return data && data.length > 0;
  }
}; 