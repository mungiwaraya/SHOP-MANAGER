import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ScanBarcode, Package, Users, ReceiptText, MoreHorizontal } from 'lucide-react';

const MOBILE_ITEMS = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/billing', label: 'Billing', icon: ScanBarcode },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/bills', label: 'Bills', icon: ReceiptText },
];

/** Mobile bottom navigation — 5 core destinations. */
export default function BottomNav({ onMore }) {
  return (
    <nav className="bottom-nav">
      <div className="bottom-nav__inner">
        {MOBILE_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `bottom-nav__item ${isActive ? 'active' : ''}`}
          >
            <item.icon />
            {item.label}
          </NavLink>
        ))}
        <button className="bottom-nav__item" onClick={onMore}>
          <MoreHorizontal />
          More
        </button>
      </div>
    </nav>
  );
}
