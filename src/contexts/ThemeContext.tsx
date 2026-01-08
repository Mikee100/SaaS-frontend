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
};

const defaultTheme: Theme = {
  colorScheme: 'system',
  accentColor: '#3b82f6',
  density: 'normal',
  fontSize: 16,
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyTheme = useCallback((themeToApply: Theme) => {
    if (themeToApply.colorScheme === 'dark' || 
        (themeToApply.colorScheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.style.setProperty('--color-primary', themeToApply.accentColor);
    document.documentElement.setAttribute('data-density', themeToApply.density);
    document.documentElement.style.fontSize = `${themeToApply.fontSize}px`;
  }, []);

  useEffect(() => {
    const fetchTheme = async () => {
      // Check if we have a token before making authenticated requests
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        // No token, use default theme
        applyTheme(defaultTheme);
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
        // On auth page, use default theme
        applyTheme(defaultTheme);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await apiClient.get('/user/me') as { data?: { themePreferences?: Partial<Theme> } };
        if (response.data?.themePreferences) {
          const fetchedTheme = { ...defaultTheme, ...response.data.themePreferences };
          setThemeState(fetchedTheme);
          applyTheme(fetchedTheme);
        } else {
          applyTheme(defaultTheme);
        }
      } catch (err: any) {
        // Only log non-401 errors (401 is expected when not authenticated)
        if (err?.message && !err.message.includes('401') && !err.message.includes('Unauthorized')) {
          setError('Failed to load theme.');
          console.error(err);
        }
        applyTheme(defaultTheme); // Apply default theme on error
      } finally {
        setLoading(false);
      }
    };
    fetchTheme();
  }, [applyTheme]);

  const setTheme = async (newTheme: Partial<Theme>) => {
    const updatedTheme = { ...theme, ...newTheme };
    setThemeState(updatedTheme);
    applyTheme(updatedTheme);

    // Check if we have a token before saving
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      // No token, theme is saved locally only
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
    <ThemeContext.Provider value={{ theme, setTheme, loading, error }}>
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
