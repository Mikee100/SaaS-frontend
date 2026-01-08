"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import apiClient from '@/utils/api';
import * as db from '@/lib/db';

type DashboardWidget = {
  id: string;
  label: string;
  visible: boolean;
};

type DashboardPreferences = {
  defaultLayout: string;
  refreshRate: number;
  widgets: DashboardWidget[];
};

type DashboardContextType = {
  preferences: DashboardPreferences;
  updatePreferences: (updates: Partial<DashboardPreferences>) => void;
  toggleWidgetVisibility: (widgetId: string) => void;
  moveWidget: (fromIndex: number, toIndex: number) => void;
  loading: boolean;
  error: string | null;
  isOnline: boolean;
};

const defaultPreferences: DashboardPreferences = {
  defaultLayout: 'default',
  refreshRate: 60, // 1 minute
  widgets: [
    { id: 'sales', label: 'Sales Overview', visible: true },
    { id: 'inventory', label: 'Inventory Status', visible: true },
    { id: 'recentOrders', label: 'Recent Orders', visible: true },
    { id: 'topProducts', label: 'Top Products', visible: true },
    { id: 'revenue', label: 'Revenue Chart', visible: true },
  ],
};

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const [preferences, setPreferences] = useState<DashboardPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const fetchPreferences = async () => {
      setLoading(true);
      
      // Check if we have a token before making authenticated requests
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        // No token, use cached or default preferences
        try {
          const cachedPrefs = await db.get('preferences', 'user-dashboard');
          if (cachedPrefs) {
            setPreferences({ ...defaultPreferences, ...cachedPrefs });
          } else {
            setPreferences(defaultPreferences);
          }
        } catch (err) {
          setPreferences(defaultPreferences);
        } finally {
          setLoading(false);
        }
        return;
      }

      // Check if we're on an auth page
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
      const isAuthPath = pathname === '/login' || 
                        pathname === '/register' || 
                        pathname === '/forgot-password' || 
                        pathname === '/reset-password';
      
      if (isAuthPath) {
        // On auth page, use cached or default preferences
        try {
          const cachedPrefs = await db.get('preferences', 'user-dashboard');
          if (cachedPrefs) {
            setPreferences({ ...defaultPreferences, ...cachedPrefs });
          } else {
            setPreferences(defaultPreferences);
          }
        } catch (err) {
          setPreferences(defaultPreferences);
        } finally {
          setLoading(false);
        }
        return;
      }

      try {
        const cachedPrefs = await db.get('preferences', 'user-dashboard');
        if (cachedPrefs) {
          setPreferences({ ...defaultPreferences, ...cachedPrefs });
        }

        if (navigator.onLine) {
          const response = await apiClient.get('/user/me');
          // Assert the type of response to inform TypeScript
          const typedResponse = response as { data?: { dashboardPreferences?: Partial<DashboardPreferences> } };
          if (typedResponse.data?.dashboardPreferences) {
            const fetchedPrefs = { ...defaultPreferences, ...typedResponse.data.dashboardPreferences };
            setPreferences(fetchedPrefs);
            await db.set('preferences', { id: 'user-dashboard', ...fetchedPrefs });
          }
        }
      } catch (err: any) {
        // Only log non-401 errors (401 is expected when not authenticated)
        if (err?.message && !err.message.includes('401') && !err.message.includes('Unauthorized')) {
          setError('Failed to load dashboard preferences.');
          console.error(err);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchPreferences();
  }, []);

const savePreferences = useCallback(
  async (prefsToSave: DashboardPreferences) => {
    // Optimistically update state and local DB
    setPreferences(prefsToSave);
    await db.set('preferences', { id: 'user-dashboard', ...prefsToSave });

    if (!isOnline) {
      console.log('Offline: Queuing preference update.');
      await db.set('offline-operations', {
        url: '/user/me/preferences',
        method: 'PUT',
        body: { dashboardPreferences: prefsToSave },
        timestamp: new Date().getTime(),
      });
      setError('You are offline. Your changes have been saved locally and will sync when you reconnect.');
      
     // ...existing code...
if ('serviceWorker' in navigator && 'SyncManager' in window) {
  navigator.serviceWorker.ready.then(reg => {
   (reg as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register('sync-offline-operations');

  });
}
// ...existing code...

      return;
    }

    try {
      await apiClient.put('/user/me/preferences', { dashboardPreferences: prefsToSave });
      setError(null);
    } catch (err) {
      setError('Failed to save dashboard preferences. Your changes are saved locally.');
      console.error(err);
      await db.set('offline-operations', {
        url: '/user/me/preferences',
        method: 'PUT',
        body: { dashboardPreferences: prefsToSave },
        timestamp: new Date().getTime(),
      });
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then(reg => {
          (reg as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register('sync-offline-operations');
        });
      }
    }
  },
  [isOnline]
);

  const updatePreferences = (updates: Partial<DashboardPreferences>) => {
    const newPrefs = { ...preferences, ...updates };
    savePreferences(newPrefs);
  };

  const toggleWidgetVisibility = (widgetId: string) => {
    const newWidgets = preferences.widgets.map(widget =>
      widget.id === widgetId ? { ...widget, visible: !widget.visible } : widget
    );
    savePreferences({ ...preferences, widgets: newWidgets });
  };

  const moveWidget = (fromIndex: number, toIndex: number) => {
    const newWidgets = [...preferences.widgets];
    const [movedWidget] = newWidgets.splice(fromIndex, 1);
    newWidgets.splice(toIndex, 0, movedWidget);
    savePreferences({ ...preferences, widgets: newWidgets });
  };

  return (
    <DashboardContext.Provider
      value={{
        preferences,
        updatePreferences,
        toggleWidgetVisibility,
        moveWidget,
        loading,
        error,
        isOnline,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
