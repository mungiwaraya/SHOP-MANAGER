import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Search, Moon, Sun, Plus } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { NAV_ITEMS } from './Sidebar';

export default function Topbar({ onMenu, onSearch, onQuickBill }) {
  const { mode, toggleMode } = useTheme();
  const location = useLocation();

  const current = NAV_ITEMS.find((n) => (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)));
  const title = current?.label || 'Shop Manager';

  return (
    <header className="topbar">
      <button className="icon-btn menu-trigger" onClick={onMenu} aria-label="Menu">
        <Menu size={19} />
      </button>
      <h1 className="topbar__title">{title}</h1>
      <div className="topbar__spacer" />

      <button
        className="btn btn--secondary btn--sm"
        onClick={onSearch}
        style={{ maxWidth: 220, justifyContent: 'flex-start', color: 'var(--text-faint)' }}
      >
        <Search size={15} />
        <span style={{ display: 'inline' }}>Search…</span>
        <span className="kbd" style={{ marginLeft: 'auto' }}>
          ⌘K
        </span>
      </button>

      <button className="btn btn--primary btn--sm" onClick={onQuickBill}>
        <Plus size={15} /> New Bill
      </button>

      <button className="icon-btn" onClick={toggleMode} aria-label="Toggle theme">
        {mode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>
    </header>
  );
}
