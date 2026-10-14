import React from 'react';
import { Search, X } from 'lucide-react';

/** Debounced search box with clear button. */
export default function SearchBar({ value, onChange, placeholder = 'Search…', className = '', autoFocus = false }) {
  return (
    <div className={`input-wrap ${className}`} style={{ minWidth: 220, flex: 1 }}>
      <span className="input-wrap__icon">
        <Search size={17} />
      </span>
      <input
        className="input"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <span className="input-wrap__suffix">
          <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => onChange('')} aria-label="Clear">
            <X size={14} />
          </button>
        </span>
      )}
    </div>
  );
}

export function Tabs({ tabs, active, onChange }) {
  return (
    <div className="tabs">
      {tabs.map((t) => (
        <button
          key={t.value}
          className={`tab ${active === t.value ? 'active' : ''}`}
          onClick={() => onChange(t.value)}
        >
          {t.label}
          {t.count !== undefined && <span className="faint"> ({t.count})</span>}
        </button>
      ))}
    </div>
  );
}
