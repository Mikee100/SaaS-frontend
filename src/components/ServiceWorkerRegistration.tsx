'use client';

import { useEffect } from 'react';

/**
 * Client-side component to handle service worker registration and updates.
 * This is rendered only on the client side to prevent hydration mismatches.
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    // Only run on client side in production
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      const registerServiceWorker = async () => {
        try {
          const swProbe = await fetch('/sw.js', {
            method: 'HEAD',
            cache: 'no-store',
          });

          if (!swProbe.ok) {
            console.warn('Service worker script not found at /sw.js; skipping registration.');
            return;
          }

          const registration = await navigator.serviceWorker.register('/sw.js');
          
          // Check for updates immediately
          registration.update().catch(console.error);
          
          // Check for updates every hour
          const updateInterval = setInterval(() => {
            registration.update().catch(console.error);
          }, 60 * 60 * 1000);

          // Listen for controller change (new service worker activated)
          let refreshing = false;
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            refreshing = true;
            window.location.reload();
          });

          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
              // When the new service worker is ready to take over
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Notify user about the update using browser notifications
                if (Notification.permission === 'granted') {
                  const notification = new Notification('Update Available', {
                    body: 'A new version is available. Click to refresh.',
                    icon: '/icon.svg',
                    requireInteraction: true
                  });
                  
                  notification.onclick = () => {
                    window.location.reload();
                    notification.close();
                  };
                } else if (Notification.permission !== 'denied') {
                  // Request permission if not already denied
                  Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                      const notification = new Notification('Update Available', {
                        body: 'A new version is available. Click to refresh.',
                        icon: '/icon.svg',
                        requireInteraction: true
                      });
                      
                      notification.onclick = () => {
                        window.location.reload();
                        notification.close();
                      };
                    }
                  });
                }
              }
            });
          });

          // Clean up interval on unmount
          return () => clearInterval(updateInterval);
          
        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      };

      // Wait for the page to be fully loaded before registering the service worker
      if (document.readyState === 'complete') {
        registerServiceWorker();
      } else {
        window.addEventListener('load', registerServiceWorker);
      }

      // Listen for online/offline status changes
      const updateOnlineStatus = () => {
        const status = navigator.onLine ? 'online' : 'offline';
        document.documentElement.setAttribute('data-online', status);
        
        // Show notification when connection status changes
        if (Notification.permission === 'granted') {
          if (status === 'offline') {
            new Notification('You are offline', {
              body: 'Some features may be limited while offline.',
              icon: '/icon.svg'
            });
          } else {
            new Notification('Back online', {
              body: 'Your connection has been restored.',
              icon: '/icon.svg'
            });
          }
        } else if (Notification.permission !== 'denied') {
          // Request permission if not already denied
          Notification.requestPermission();
        }
      };

      window.addEventListener('online', updateOnlineStatus);
      window.addEventListener('offline', updateOnlineStatus);
      updateOnlineStatus(); // Set initial status

      // Clean up event listeners
      return () => {
        window.removeEventListener('online', updateOnlineStatus);
        window.removeEventListener('offline', updateOnlineStatus);
      };
    }
  }, []);

  return null;
}
