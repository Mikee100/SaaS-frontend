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
      try {
        setLoading(true);
        const response = await apiClient.get('/user/me');
        if (response.data?.themePreferences) {
          const fetchedTheme = { ...defaultTheme, ...response.data.themePreferences };
          setThemeState(fetchedTheme);
          applyTheme(fetchedTheme);
        } else {
          applyTheme(defaultTheme);
        }
      } catch (err) {
        setError('Failed to load theme.');
        console.error(err);
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

    try {
      await apiClient.put('/user/me/preferences', { themePreferences: updatedTheme });
    } catch (err) {
      setError('Failed to save theme.');
      console.error(err);
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
