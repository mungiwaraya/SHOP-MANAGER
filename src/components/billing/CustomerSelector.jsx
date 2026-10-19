import React, { useEffect, useRef, useState } from 'react';
import { User, Phone } from 'lucide-react';
import { useDebounce } from '../../hooks/useUtilities';
import { searchCustomersLite } from '../../services/customersService';

/**
 * Super-fast POS customer input:
 *  - Directly type Customer Name and Mobile Number (no modal/popup needed!)
 *  - Quick "Walk-in" button for 1-click fallback
 *  - Smart suggestion dropdown if typing an existing customer
 */
export default function CustomerSelector({ customer, onChange }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapRef = useRef(null);

  const debounced = useDebounce(query, 250);

  // Search suggestions when typing
  useEffect(() => {
    if (!query.trim() || !showSuggestions) {
      setSuggestions([]);
      return;
    }
    let active = true;
    searchCustomersLite(debounced, 5)
      .then((rows) => {
        if (active) setSuggestions(rows || []);
      })
      .catch(() => {
        if (active) setSuggestions([]);
      });
    return () => {
      active = false;
    };
  }, [debounced, showSuggestions, query]);

  // Click outside to close suggestions
  useEffect(() => {
    const onClickAway = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, []);

  const handleNameChange = (val) => {
    onChange({ ...(customer || {}), name: val, id: null });
    setQuery(val);
    setShowSuggestions(true);
  };

  const handleMobileChange = (val) => {
    const cleanMobile = val.replace(/\D/g, '').slice(0, 10);
    onChange({ ...(customer || {}), mobile: cleanMobile, id: null });
    setQuery(cleanMobile);
    setShowSuggestions(true);
  };

  const selectSuggestion = (s) => {
    onChange({
      id: s.id,
      name: s.name,
      mobile: s.mobile || '',
      email: s.email || '',
      address: s.address || '',
    });
    setShowSuggestions(false);
  };

  const setWalkIn = () => {
    onChange({
      id: null,
      name: 'Walk-in Customer',
      mobile: '',
    });
    setShowSuggestions(false);
  };

  const clearCustomer = () => {
    onChange({
      id: null,
      name: '',
      mobile: '',
    });
    setShowSuggestions(false);
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-faint)', fontWeight: 600 }}>
          Customer Info (Directly enter name & mobile)
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            style={{ padding: '3px 10px', fontSize: '0.78rem' }}
            onClick={setWalkIn}
          >
            Walk-in (Default)
          </button>
          {(customer?.name || customer?.mobile) && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              style={{ padding: '3px 8px', fontSize: '0.78rem', color: 'var(--text-faint)' }}
              onClick={clearCustomer}
              title="Clear customer fields"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
        {/* Customer Name */}
        <div className="input-wrap">
          <span className="input-wrap__icon">
            <User size={16} />
          </span>
          <input
            className="input"
            placeholder="Customer Name (optional)"
            value={customer?.name || ''}
            onChange={(e) => handleNameChange(e.target.value)}
            onFocus={() => {
              if (customer?.name) {
                setQuery(customer.name);
                setShowSuggestions(true);
              }
            }}
          />
        </div>

        {/* Mobile Number */}
        <div className="input-wrap">
          <span className="input-wrap__icon">
            <Phone size={16} />
          </span>
          <input
            className="input"
            placeholder="Mobile (10 digits for WhatsApp)"
            type="tel"
            maxLength={10}
            value={customer?.mobile || ''}
            onChange={(e) => handleMobileChange(e.target.value)}
            onFocus={() => {
              if (customer?.mobile) {
                setQuery(customer.mobile);
                setShowSuggestions(true);
              }
            }}
          />
        </div>
      </div>

      {/* Autocomplete suggestions if existing customer matches */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="selector-dropdown" style={{ zIndex: 90 }}>
          <div style={{ padding: '6px 12px', fontSize: '0.75rem', color: 'var(--text-faint)', borderBottom: '1px solid var(--glass-border)' }}>
            Existing customers found:
          </div>
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              className="selector-option"
              onClick={() => selectSuggestion(s)}
            >
              <User size={15} style={{ opacity: 0.6 }} />
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <div className="selector-option__name">{s.name}</div>
                <div className="selector-option__meta">
                  {s.mobile || 'No mobile'} {s.total_orders ? `• ${s.total_orders} orders` : ''}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
