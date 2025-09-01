const CACHE_NAME = 'static-cache-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/offline.html', // We should create this page later
  '/manifest.json',
  '/next.svg',
  '/vercel.svg',
  '/icon.svg',
  '/globe.svg',
  '/file.svg',
  '/window.svg'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Error caching static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - handle requests
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // For navigation requests, use a network-first strategy with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/offline.html');
      })
    );
    return;
  }

  // For other GET requests (static assets), use a cache-first strategy
  if (request.method === 'GET' && new URL(request.url).origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        // If we have a cached response, return it.
        if (cachedResponse) {
          return cachedResponse;
        }
        // Otherwise, fetch from the network.
        return fetch(request);
      })
    );
  }
});

// Background sync for offline operations
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-operations') {
    console.log('Service Worker: Syncing offline operations...');
    event.waitUntil(syncOfflineData());
  }
});

const DB_NAME = 'saas-platform-db';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    // The upgrade logic is handled by the main app, so we don't need it here.
  });
}

async function getAllFromDB(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function deleteFromDB(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

async function syncOfflineData() {
  const operations = await getAllFromDB('offline-operations');

  for (const op of operations) {
    try {
      const response = await fetch(op.url, {
        method: op.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(op.body),
      });

      if (response.ok) {
        console.log(`Operation for ${op.url} synced successfully.`);
        // Use the operation's own auto-incremented key for deletion
        await deleteFromDB('offline-operations', op.id);
      } else {
        console.error(`Failed to sync operation for ${op.url}. Server responded with:`, response.status);
      }
    } catch (error) {
      console.error(`Network error while syncing operation for ${op.url}:`, error);
      // Don't delete the operation, it will be retried on the next sync event
    }
  }
}

console.log('Service Worker loaded');