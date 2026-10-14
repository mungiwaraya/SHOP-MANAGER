import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ScanBarcode,
  Package,
  Boxes,
  Users,
  ReceiptText,
  BarChart3,
  Settings,
  LogOut,
  ShoppingBag,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useShop } from '../contexts/ShopContext';
import { initials } from '../utils/formatters';

export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/billing', label: 'Billing', icon: ScanBarcode },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/inventory', label: 'Inventory', icon: Boxes },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/bills', label: 'Bills', icon: ReceiptText },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ open, onClose }) {
  const { user, profile, signOut } = useAuth();
  const { settings, shopName } = useShop();
  const navigate = useNavigate();

  const handleNav = () => {
    if (window.innerWidth <= 1024) onClose();
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <>
      <div className={`sidebar-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar__brand">
          <div className="sidebar__logo">
            {settings?.logo_url ? <img src={settings.logo_url} alt="Shop logo" /> : <ShoppingBag size={20} />}
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="sidebar__name">{shopName}</div>
            <div className="sidebar__tagline">Shop Manager</div>
          </div>
        </div>

        <nav className="sidebar__nav">
          <div className="sidebar__section-label">Menu</div>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={handleNav}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <item.icon />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <div className="avatar">{initials(profile?.full_name || user?.email || 'A')}</div>
            <div style={{ minWidth: 0 }}>
              <div className="sidebar__user-name">{profile?.full_name || 'Admin'}</div>
              <div className="sidebar__user-mail">{user?.email}</div>
            </div>
          </div>
          <button className="btn btn--ghost btn--sm" onClick={handleLogout} style={{ justifyContent: 'flex-start' }}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
