// OFFLINE FUNCTIONALITY PAUSED FOR DEBUGGING
/*
const CACHE_NAME = 'saas-platform-v1';
const STATIC_CACHE = 'static-v1';
const API_CACHE = 'api-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/next.svg',
  '/vercel.svg',
  '/icon.svg',
  '/globe.svg',
  '/file.svg',
  '/window.svg'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/products',
  '/api/customers',
  '/api/sales',
  '/api/dashboard/stats',
  '/api/billing'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
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
          if (cacheName !== STATIC_CACHE && cacheName !== API_CACHE && cacheName !== DYNAMIC_CACHE) {
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
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets
  if (url.origin === self.location.origin) {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // Handle external resources (fonts, etc.)
  event.respondWith(handleExternalRequest(request));
});

// Handle API requests with cache-first strategy
async function handleApiRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache the successful response
      const cache = await caches.open(API_CACHE);
      const clonedResponse = networkResponse.clone();
      cache.put(request, clonedResponse);
      
      return networkResponse;
    }
  } catch (error) {
    console.log('Network failed for API request:', request.url);
  }

  // Fallback to cache
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    console.log('Serving API from cache:', request.url);
    return cachedResponse;
  }

  // Return offline fallback for critical endpoints
  if (isCriticalEndpoint(request.url)) {
    return new Response(JSON.stringify({
      message: 'Offline mode - data may be outdated',
      offline: true,
      cached: false
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response('Offline', { status: 503 });
}

// Handle static asset requests
async function handleStaticRequest(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      const clonedResponse = networkResponse.clone();
      cache.put(request, clonedResponse);
    }
    return networkResponse;
  } catch (error) {
    // Return offline page for navigation requests
    if (request.destination === 'document') {
      return caches.match('/offline.html');
    }
    return new Response('Offline', { status: 503 });
  }
}

// Handle external resource requests
async function handleExternalRequest(request) {
  // Only cache http(s) requests
  if (!request.url.startsWith('http')) {
    return fetch(request);
  }
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      const clonedResponse = networkResponse.clone();
      cache.put(request, clonedResponse);
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('Offline', { status: 503 });
  }
}

// Check if endpoint is critical for offline functionality
function isCriticalEndpoint(url) {
  const criticalEndpoints = [
    '/api/products',
    '/api/customers', 
    '/api/sales',
    '/api/dashboard/stats'
  ];
  
  return criticalEndpoints.some(endpoint => url.includes(endpoint));
}

// Background sync for offline operations
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-offline-data') {
    event.waitUntil(syncOfflineData());
  }
});

// Sync offline data when connection is restored
async function syncOfflineData() {
  try {
    // Get offline operations from IndexedDB
    const offlineOperations = await getOfflineOperations();
    
    for (const operation of offlineOperations) {
      try {
        const response = await fetch(operation.url, {
          method: operation.method,
          headers: operation.headers,
          body: operation.body
        });
        
        if (response.ok) {
          // Remove from offline queue
          await removeOfflineOperation(operation.id);
        }
      } catch (error) {
        console.error('Failed to sync operation:', operation, error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Helper functions for offline operations (to be implemented)
async function getOfflineOperations() {
  // TODO: Implement IndexedDB access
  return [];
}

async function removeOfflineOperation(id) {
  // TODO: Implement IndexedDB access
  return;
}

// Handle push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'New update available',
    icon: '/icon.svg',
    badge: '/icon.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View',
        icon: '/icon.svg'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icon.svg'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('SaaS Platform', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

console.log('Service Worker loaded'); 
*/ 