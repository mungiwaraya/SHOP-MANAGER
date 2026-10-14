import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, Users, ReceiptText, ArrowRight } from 'lucide-react';
import Modal from '../components/ui/Modal';
import { useDebounce } from '../hooks/useUtilities';
import { globalSearch } from '../services/analyticsService';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useShop } from '../contexts/ShopContext';

/** Global search across Products, Customers and Invoices (⌘K). */
export default function GlobalSearch({ open, onClose }) {
  const [term, setTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ products: [], customers: [], invoices: [] });
  const debounced = useDebounce(term, 280);
  const navigate = useNavigate();
  const { currency } = useShop();

  useEffect(() => {
    if (!open) {
      setTerm('');
      setResults({ products: [], customers: [], invoices: [] });
      return;
    }
    let active = true;
    if (!debounced.trim()) {
      setResults({ products: [], customers: [], invoices: [] });
      return undefined;
    }
    setLoading(true);
    globalSearch(debounced)
      .then((r) => active && setResults(r))
      .catch(() => active && setResults({ products: [], customers: [], invoices: [] }))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [debounced, open]);

  const go = (path) => {
    onClose();
    navigate(path);
  };

  const empty = !loading && !results.products.length && !results.customers.length && !results.invoices.length;

  return (
    <Modal open={open} onClose={onClose} title="Global Search" size="md">
      <div className="input-wrap mb-3">
        <span className="input-wrap__icon">
          <Search size={18} />
        </span>
        <input
          className="input search-modal-input"
          placeholder="Search products, customers, invoices…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          autoFocus
        />
      </div>

      {loading && (
        <div className="loading-center" style={{ padding: 26 }}>
          <div className="spinner" />
        </div>
      )}

      {!loading && !term.trim() && (
        <p className="muted text-center" style={{ padding: '18px 0' }}>
          Start typing to search across your shop data.
        </p>
      )}

      {empty && term.trim() && (
        <p className="muted text-center" style={{ padding: '18px 0' }}>
          No results found for “{term}”.
        </p>
      )}

      {results.products.length > 0 && (
        <div className="search-results-group">
          <div className="search-results-group__label">Products</div>
          {results.products.map((p) => (
            <button key={p.id} className="selector-option" onClick={() => go(`/products?q=${encodeURIComponent(p.name)}`)}>
              <div className="flex items-center gap-3">
                <Package size={17} className="muted" />
                <div>
                  <div className="selector-option__name">{p.name}</div>
                  <div className="selector-option__meta">
                    {p.sku} • Stock {p.stock_quantity}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <strong>{formatCurrency(p.selling_price, currency)}</strong>
                <ArrowRight size={14} className="faint" />
              </div>
            </button>
          ))}
        </div>
      )}

      {results.customers.length > 0 && (
        <div className="search-results-group">
          <div className="search-results-group__label">Customers</div>
          {results.customers.map((c) => (
            <button key={c.id} className="selector-option" onClick={() => go(`/customers/${c.id}`)}>
              <div className="flex items-center gap-3">
                <Users size={17} className="muted" />
                <div>
                  <div className="selector-option__name">{c.name}</div>
                  <div className="selector-option__meta">
                    {c.mobile} • {c.total_orders} orders
                  </div>
                </div>
              </div>
              <ArrowRight size={14} className="faint" />
            </button>
          ))}
        </div>
      )}

      {results.invoices.length > 0 && (
        <div className="search-results-group">
          <div className="search-results-group__label">Invoices</div>
          {results.invoices.map((inv) => (
            <button key={inv.id} className="selector-option" onClick={() => go(`/bills?invoice=${inv.id}`)}>
              <div className="flex items-center gap-3">
                <ReceiptText size={17} className="muted" />
                <div>
                  <div className="selector-option__name">{inv.invoice_number}</div>
                  <div className="selector-option__meta">
                    {inv.customer_name} • {formatDate(inv.created_at)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <strong>{formatCurrency(inv.total_amount, currency)}</strong>
                <ArrowRight size={14} className="faint" />
              </div>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}
