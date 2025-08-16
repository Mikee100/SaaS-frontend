import { openDB, DBSchema, IDBPDatabase } from 'idb';

const DB_NAME = 'saas-platform-db';
const DB_VERSION = 1;

interface SaaSPlatformDB extends DBSchema {
  products: {
    key: string;
    value: any;
  };
  customers: {
    key: string;
    value: any;
  };
  sales: {
    key: string;
    value: any;
  };
  'offline-operations': {
    key: number;
    value: any;
    indexes: { 'by-timestamp': number };
  };
}

let dbPromise: Promise<IDBPDatabase<SaaSPlatformDB>> | null = null;

const getDb = () => {
  if (!dbPromise) {
    dbPromise = openDB<SaaSPlatformDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('products')) {
          db.createObjectStore('products', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('customers')) {
          db.createObjectStore('customers', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('sales')) {
          db.createObjectStore('sales', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('offline-operations')) {
          const store = db.createObjectStore('offline-operations', { autoIncrement: true, keyPath: 'id' });
          store.createIndex('by-timestamp', 'timestamp');
        }
      },
    });
  }
  return dbPromise;
};

export async function set(storeName: keyof SaaSPlatformDB, value: any) {
  const db = await getDb();
  return db.put(storeName, value);
}

export async function getAll(storeName: keyof SaaSPlatformDB) {
  const db = await getDb();
  return db.getAll(storeName);
}

export async function get(storeName: keyof SaaSPlatformDB, key: string) {
    const db = await getDb();
    return db.get(storeName, key);
}

export async function del(storeName: keyof SaaSPlatformDB, key: string) {
  const db = await getDb();
  return db.delete(storeName, key);
}

export async function clear(storeName: keyof SaaSPlatformDB) {
    const db = await getDb();
    return db.clear(storeName);
}
