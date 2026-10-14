import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { useTheme } from './ThemeContext';
import { fetchShopSettings, updateShopSettings } from '../services/settingsService';

const ShopContext = createContext(null);

/**
 * Loads and caches shop settings (branding, invoice config, theme).
 * Theme preferences are saved in Supabase so they persist across devices.
 */
export function ShopProvider({ children }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { applySettingsTheme } = useTheme();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);

  const reloadSettings = useCallback(async () => {
    if (!isAuthenticated) {
      setSettings(null);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchShopSettings();
      setSettings(data);
      if (data) applySettingsTheme(data);
    } catch {
      // keep previous settings on failure
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, applySettingsTheme]);

  useEffect(() => {
    if (!authLoading) reloadSettings();
  }, [authLoading, reloadSettings]);

  const saveSettings = useCallback(
    async (patch) => {
      const updated = await updateShopSettings(patch);
      setSettings(updated);
      applySettingsTheme(updated);
      return updated;
    },
    [applySettingsTheme]
  );

  const value = {
    settings,
    loading,
    reloadSettings,
    saveSettings,
    setSettings,
    currency: settings?.currency_symbol || '₹',
    shopName: settings?.shop_name || 'My Shop',
  };

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop must be used within ShopProvider');
  return ctx;
}
