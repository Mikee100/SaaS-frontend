"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import apiClient from '@/utils/api';

type Theme = {
  colorScheme: 'light' | 'dark' | 'system';
  accentColor: string;
  density: 'compact' | 'normal' | 'comfortable';
  fontSize: number;
};

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Partial<Theme>) => void;
  loading: boolean;
  error: string | null;
  /** True when the UI is currently in dark mode (either explicit or from system). */
  isDark: boolean;
};

const defaultTheme: Theme = {
  colorScheme: 'light',
  accentColor: '#3b82f6',
  density: 'normal',
  fontSize: 16,
};

const THEME_STORAGE_KEY = 'saas-theme-preferences';

function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Theme>;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      colorScheme: parsed.colorScheme && ['light', 'dark', 'system'].includes(parsed.colorScheme) ? parsed.colorScheme : defaultTheme.colorScheme,
      accentColor: typeof parsed.accentColor === 'string' ? parsed.accentColor : defaultTheme.accentColor,
      density: parsed.density && ['compact', 'normal', 'comfortable'].includes(parsed.density) ? parsed.density : defaultTheme.density,
      fontSize: typeof parsed.fontSize === 'number' && parsed.fontSize >= 12 && parsed.fontSize <= 24 ? parsed.fontSize : defaultTheme.fontSize,
    };
  } catch {
    return null;
  }
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);

  const applyTheme = useCallback((themeToApply: Theme) => {
    const effectiveDark =
      themeToApply.colorScheme === 'dark' ||
      (themeToApply.colorScheme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setIsDark(effectiveDark);
    if (typeof document !== 'undefined') {
      if (effectiveDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      }
      document.documentElement.style.setProperty('--color-primary', themeToApply.accentColor);
      document.documentElement.setAttribute('data-density', themeToApply.density);
      document.documentElement.style.fontSize = `${themeToApply.fontSize}px`;
    }
  }, []);

  useEffect(() => {
    const fetchTheme = async () => {
      // Check if we have a token before making authenticated requests
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        // No token: use last saved theme from localStorage so it doesn't reset to system
        const stored = getStoredTheme();
        const themeToUse = stored ?? defaultTheme;
        setThemeState(themeToUse);
        applyTheme(themeToUse);
        setLoading(false);
        return;
      }

      // Check if we're on an auth page
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
      const isAuthPath = pathname === '/login' || 
                        pathname === '/register' || 
                        pathname === '/forgot-password' || 
                        pathname === '/reset-password';
      
      if (isAuthPath) {
        // On auth page: use last saved theme from localStorage so theme doesn't flip when navigating
        const stored = getStoredTheme();
        const themeToUse = stored ?? defaultTheme;
        setThemeState(themeToUse);
        applyTheme(themeToUse);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Apply stored theme immediately so we don't flash system while loading
        const stored = getStoredTheme();
        if (stored) {
          setThemeState(stored);
          applyTheme(stored);
        }
        const response = await apiClient.get('/user/me') as { themePreferences?: Partial<Theme>; data?: { themePreferences?: Partial<Theme> } };
        const themePrefs = response.themePreferences ?? response.data?.themePreferences;
        if (themePrefs) {
          const fetchedTheme = { ...defaultTheme, ...themePrefs };
          setThemeState(fetchedTheme);
          applyTheme(fetchedTheme);
        } else {
          const stored = getStoredTheme();
          const themeToUse = stored ?? defaultTheme;
          setThemeState(themeToUse);
          applyTheme(themeToUse);
        }
      } catch (err: any) {
        // Only log non-401 errors (401 is expected when not authenticated)
        if (err?.message && !err.message.includes('401') && !err.message.includes('Unauthorized')) {
          setError('Failed to load theme.');
          console.error(err);
        }
        const stored = getStoredTheme();
        const themeToUse = stored ?? defaultTheme;
        setThemeState(themeToUse);
        applyTheme(themeToUse);
      } finally {
        setLoading(false);
      }
    };
    fetchTheme();
  }, [applyTheme]);

  // When colorScheme is 'system', re-apply theme when OS preference changes
  useEffect(() => {
    if (theme.colorScheme !== 'system' || typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => applyTheme(theme);
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, [theme, theme.colorScheme, applyTheme]);

  const setTheme = async (newTheme: Partial<Theme>) => {
    const updatedTheme = { ...theme, ...newTheme };
    setThemeState(updatedTheme);
    applyTheme(updatedTheme);

    // Always persist to localStorage so theme doesn't reset on auth pages or when provider remounts
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(updatedTheme));
      } catch {
        // ignore storage errors
      }
    }

    // Check if we have a token before saving to server
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      return;
    }

    try {
      await apiClient.put('/user/me/preferences', { themePreferences: updatedTheme });
    } catch (err: any) {
      // Only log non-401 errors (401 is expected when not authenticated)
      if (err?.message && !err.message.includes('401') && !err.message.includes('Unauthorized')) {
        setError('Failed to save theme.');
        console.error(err);
      }
      // Optionally revert theme state on save failure
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, loading, error, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
