import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);

const DEFAULTS = {
  theme_mode: 'light',
  primary_color: '#111114',
  accent_color: '#5b7cfa',
  border_radius: '16px',
};

/** #rrggbb → "r, g, b" */
function hexToRgb(hex) {
  const clean = (hex || '#111114').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const int = parseInt(full, 16);
  if (Number.isNaN(int)) return '17, 17, 20';
  return `${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}`;
}

/** Slightly lighter / darker mix for hover states */
function mixWithWhite(hex, amount = 0.18) {
  const rgb = hexToRgb(hex).split(', ').map(Number);
  const mixed = rgb.map((v) => Math.round(v + (255 - v) * amount));
  return `rgb(${mixed.join(', ')})`;
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('shop-manager-theme') || 'null');
      return { ...DEFAULTS, ...(saved || {}) };
    } catch {
      return { ...DEFAULTS };
    }
  });

  // Apply tokens to <html>
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme.theme_mode);
    root.style.setProperty('--primary-color', theme.primary_color);
    root.style.setProperty('--primary-rgb', hexToRgb(theme.primary_color));
    root.style.setProperty('--primary-hover', mixWithWhite(theme.primary_color, 0.22));
    root.style.setProperty('--accent-color', theme.accent_color);
    root.style.setProperty('--accent-rgb', hexToRgb(theme.accent_color));
    root.style.setProperty('--radius-lg', theme.border_radius);
    localStorage.setItem('shop-manager-theme', JSON.stringify(theme));

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme.theme_mode === 'dark' ? '#0b0b0f' : '#f4f4f6');
  }, [theme]);

  const setTheme = useCallback((partial) => {
    setThemeState((prev) => ({ ...prev, ...partial }));
  }, []);

  const applySettingsTheme = useCallback((settings) => {
    if (!settings) return;
    setThemeState((prev) => ({
      ...prev,
      theme_mode: settings.theme_mode || prev.theme_mode,
      primary_color: settings.primary_color || prev.primary_color,
      accent_color: settings.accent_color || prev.accent_color,
      border_radius: settings.border_radius || prev.border_radius,
    }));
  }, []);

  const toggleMode = useCallback(() => {
    setThemeState((prev) => ({
      ...prev,
      theme_mode: prev.theme_mode === 'dark' ? 'light' : 'dark',
    }));
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleMode, applySettingsTheme, mode: theme.theme_mode }),
    [theme, setTheme, toggleMode, applySettingsTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
