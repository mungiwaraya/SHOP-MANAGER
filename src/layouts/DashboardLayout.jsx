import React, { useCallback, useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import BottomNav from './BottomNav';
import GlobalSearch from './GlobalSearch';
import DemoBanner from '../components/DemoBanner';
import { Drawer } from '../components/ui/Modal';
import { useShop } from '../contexts/ShopContext';
import { Boxes, BarChart3, Settings as SettingsIcon, ShoppingBag } from 'lucide-react';

/** Dashboard shell: responsive sidebar + topbar + bottom nav (mobile). */
export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();
  const { settings, shopName } = useShop();

  // ⌘K / Ctrl+K opens global search
  const onKey = useCallback((e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      setSearchOpen(true);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onKey]);

  const goAndClose = (path) => {
    setMoreOpen(false);
    navigate(path);
  };

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="app-main">
        <DemoBanner />
        <Topbar
          onMenu={() => setSidebarOpen(true)}
          onSearch={() => setSearchOpen(true)}
          onQuickBill={() => navigate('/billing')}
        />

        <main className="app-content fade-in">
          <Outlet />
        </main>
      </div>

      <BottomNav onMore={() => setMoreOpen(true)} />

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />

      <Drawer open={moreOpen} onClose={() => setMoreOpen(false)} title={shopName}>
        <div className="sidebar__brand" style={{ padding: '4px 0 18px' }}>
          <div className="sidebar__logo">
            {settings?.logo_url ? <img src={settings.logo_url} alt="Logo" /> : <ShoppingBag size={20} />}
          </div>
          <div>
            <div className="sidebar__name">{shopName}</div>
            <div className="sidebar__tagline">Shop Manager</div>
          </div>
        </div>
        <div className="sidebar__nav">
          <button className="nav-item" onClick={() => goAndClose('/inventory')}>
            <Boxes /> Inventory
          </button>
          <button className="nav-item" onClick={() => goAndClose('/analytics')}>
            <BarChart3 /> Analytics
          </button>
          <button className="nav-item" onClick={() => goAndClose('/settings')}>
            <SettingsIcon /> Settings
          </button>
        </div>
      </Drawer>
    </div>
  );
}
