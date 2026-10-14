import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2, ScanBarcode, CheckCircle2, RotateCcw, PackageSearch, Percent } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { GlassCard, CardHeader } from '../components/ui/Cards';
import { FormField, Input, Select, TextArea, Segmented } from '../components/ui/Input';
import { EmptyState, LoadingState } from '../components/ui/States';
import Modal from '../components/ui/Modal';
import CustomerSelector from '../components/billing/CustomerSelector';
import InvoiceActions from '../components/invoices/InvoiceActions';
import InvoicePreview from '../components/invoices/InvoicePreview';
import { useShop } from '../contexts/ShopContext';
import { useToast } from '../contexts/ToastContext';
import { searchProductsLite } from '../services/productsService';
import { createInvoice } from '../services/invoicesService';
import { useDebounce } from '../hooks/useUtilities';
import { formatCurrency } from '../utils/formatters';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' },
];

/** POS-style billing — minimum clicks from product to invoice. */
export default function Billing() {
  const { settings, currency } = useShop();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [cart, setCart] = useState([]);
  const [orderDiscount, setOrderDiscount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [createdInvoice, setCreatedInvoice] = useState(null);

  const debounced = useDebounce(query, 280);

  useEffect(() => {
    let active = true;
    setLoadingProducts(true);
    searchProductsLite(debounced, 24)
      .then((rows) => active && setProducts(rows))
      .catch(() => active && setProducts([]))
      .finally(() => active && setLoadingProducts(false));
    return () => {
      active = false;
    };
  }, [debounced]);

  const effectivePrice = (product, variant) => {
    const base = variant?.price_override != null ? Number(variant.price_override) : Number(product.selling_price);
    const disc = Number(product.discount_percent || 0);
    return base - (base * disc) / 100;
  };

  const availableStock = (product, variant) => {
    if (variant) return Number(variant.stock_quantity || 0);
    return Number(product.stock_quantity || 0);
  };

  const addProduct = (product) => {
    if (product.has_variants && product.variants?.length) {
      // Add the first in-stock variant; user can swap below
      const variant = product.variants.find((v) => v.stock_quantity > 0) || product.variants[0];
      addToCart(product, variant);
    } else {
      if (product.stock_quantity <= 0) {
        toast.warn('This product is out of stock');
        return;
      }
      addToCart(product, null);
    }
  };

  const addToCart = (product, variant) => {
    setCart((prev) => {
      const key = `${product.id}::${variant?.id || 'base'}`;
      const existing = prev.find((l) => l.key === key);
      const max = availableStock(product, variant);
      if (existing) {
        if (existing.quantity + 1 > max) {
          toast.warn(`Only ${max} unit(s) in stock`);
          return prev;
        }
        return prev.map((l) => (l.key === key ? { ...l, quantity: l.quantity + 1 } : l));
      }
      return [
        ...prev,
        {
          key,
          product_id: product.id,
          variant_id: variant?.id || null,
          product_name: product.name,
          sku: product.sku,
          size: variant?.size || '',
          color: variant?.color || '',
          unit_price: effectivePrice(product, variant),
          discount_amount: 0,
          quantity: 1,
          max,
          has_variants: product.has_variants,
          variants: product.variants || [],
        },
      ];
    });
  };

  const setQty = (key, qty) => {
    setCart((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        const clamped = Math.max(1, Math.min(qty, l.max));
        return { ...l, quantity: clamped };
      })
    );
  };

  const setLineDiscount = (key, pct) => {
    setCart((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        const value = Math.max(0, Math.min(100, Number(pct) || 0));
        return { ...l, discount_amount: value };
      })
    );
  };

  const swapVariant = (key, variantId) => {
    setCart((prev) => {
      const line = prev.find((l) => l.key === key);
      if (!line) return prev;
      const variant = line.variants.find((v) => v.id === variantId);
      if (!variant) return prev;
      const newKey = `${line.product_id}::${variant.id}`;
      const newLine = {
        ...line,
        key: newKey,
        variant_id: variant.id,
        size: variant.size || '',
        color: variant.color || '',
        unit_price:
          variant.price_override != null ? Number(variant.price_override) : line.unit_price,
        max: Number(variant.stock_quantity || 0),
        quantity: Math.min(line.quantity, Math.max(1, Number(variant.stock_quantity || 0))),
      };
      const others = prev.filter((l) => l.key !== key && l.key !== newKey);
      const dup = prev.find((l) => l.key === newKey);
      if (dup) return others.map((l) => (l.key === newKey ? { ...l, quantity: Math.min(l.quantity + line.quantity, l.max) } : l));
      return [...others, newLine];
    });
  };

  const removeLine = (key) => setCart((prev) => prev.filter((l) => l.key !== key));

  // ── Totals ────────────────────────────────────────────────
  const totals = useMemo(() => {
    let subtotal = 0;
    let itemDiscounts = 0;
    for (const line of cart) {
      const gross = line.unit_price * line.quantity;
      const disc = (gross * (line.discount_amount || 0)) / 100;
      subtotal += gross;
      itemDiscounts += disc;
    }
    const afterItems = subtotal - itemDiscounts;
    const orderDiscPct = Math.max(0, Math.min(100, Number(orderDiscount) || 0));
    const orderDiscAmt = (afterItems * orderDiscPct) / 100;
    const taxable = afterItems - orderDiscAmt;
    const taxRate = settings?.tax_enabled ? Number(settings.tax_rate || 0) : 0;
    const taxAmt = (taxable * taxRate) / 100;
    return {
      subtotal,
      itemDiscounts,
      orderDiscPct,
      orderDiscAmt,
      discountTotal: itemDiscounts + orderDiscAmt,
      taxAmt,
      taxRate,
      total: taxable + taxAmt,
    };
  }, [cart, orderDiscount, settings]);

  const canGenerate = cart.length > 0 && !saving;

  const generateInvoice = async () => {
    if (!cart.length) return;
    if (customer?.mobile === '' && customer?.name === 'Walk-in Customer') {
      // walk-in is fine
    }

    setSaving(true);
    try {
      const itemsPayload = cart.map((line) => {
        const gross = line.unit_price * line.quantity;
        const disc = (gross * (line.discount_amount || 0)) / 100;
        return {
          product_id: line.product_id,
          variant_id: line.variant_id,
          product_name: line.product_name,
          sku: line.sku,
          size: line.size,
          color: line.color,
          quantity: line.quantity,
          unit_price: line.unit_price,
          discount_amount: Number(disc.toFixed(2)),
          total_amount: Number((gross - disc).toFixed(2)),
        };
      });

      const invoice = await createInvoice({
        customer_id: customer?.id || null,
        customer_name: customer?.name || 'Walk-in Customer',
        customer_mobile: customer?.mobile || '',
        customer_email: customer?.email || '',
        customer_address: customer?.address || '',
        subtotal: Number(totals.subtotal.toFixed(2)),
        discount_amount: Number(totals.discountTotal.toFixed(2)),
        tax_amount: Number(totals.taxAmt.toFixed(2)),
        total_amount: Number(totals.total.toFixed(2)),
        payment_method: paymentMethod,
        payment_status: paymentStatus,
        notes: notes.trim(),
        items: itemsPayload,
      });

      // Load full invoice (with items) for preview/PDF
      const { getInvoice } = await import('../services/invoicesService');
      const full = await getInvoice(invoice.id);
      setCreatedInvoice(full);
      toast.success(`Invoice ${full.invoice_number} generated successfully`);
    } catch (err) {
      const msg = String(err?.message || '');
      toast.error(
        msg.includes('stock')
          ? 'Not enough stock for one or more items'
          : 'Could not generate the invoice. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const startNewBill = () => {
    setCreatedInvoice(null);
    setCart([]);
    setCustomer(null);
    setOrderDiscount('');
    setNotes('');
    setPaymentMethod('cash');
    setPaymentStatus('paid');
    setQuery('');
  };

  // ── Post-sale modal ───────────────────────────────────────
  if (createdInvoice) {
    return (
      <div>
        <div className="page-header">
          <div className="page-header__text">
            <h1>Invoice Generated 🎉</h1>
            <p>
              <strong>{createdInvoice.invoice_number}</strong> — {createdInvoice.customer_name} •{' '}
              {formatCurrency(createdInvoice.total_amount, currency)}
            </p>
          </div>
          <div className="page-actions">
            <Button variant="secondary" onClick={startNewBill}>
              <RotateCcw size={16} /> New Bill
            </Button>
            <Button onClick={() => navigate('/bills')}>View All Bills</Button>
          </div>
        </div>

        <GlassCard>
          <div className="flex items-center gap-3 mb-4">
            <div className="stat-card__icon stat-card__icon--success" style={{ width: 48, height: 48 }}>
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h3>Payment received — {String(createdInvoice.payment_method).replace('_', ' ').toUpperCase()}</h3>
              <p className="muted" style={{ fontSize: '0.9rem' }}>
                Download the PDF or send it to your customer on WhatsApp.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <InvoiceActions invoice={createdInvoice} />
          </div>

          <details>
            <summary style={{ cursor: 'pointer', fontWeight: 750, marginBottom: 12 }}>
              View invoice preview
            </summary>
            <InvoicePreview invoice={createdInvoice} />
          </details>
        </GlassCard>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-header__text">
          <h1>New Bill</h1>
          <p>Search products, add to cart, take payment — invoice ready in seconds.</p>
        </div>
      </div>

      <div className="pos-grid">
        {/* Left: customer + products */}
        <div className="pos-products">
          <GlassCard>
            <CardHeader title="Customer" icon={<ScanBarcode size={19} />} />
            <CustomerSelector selected={customer} onSelect={setCustomer} />
          </GlassCard>

          <div className="mt-4">
            <GlassCard>
              <CardHeader title="Products" icon={<PackageSearch size={19} />} />
              <div className="input-wrap">
                <span className="input-wrap__icon">
                  <PackageSearch size={17} />
                </span>
                <input
                  className="input"
                  placeholder="Search products by name or SKU…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                />
              </div>

              {loadingProducts ? (
                <LoadingState label="Finding products…" />
              ) : products.length === 0 ? (
                <EmptyState
                  icon={<PackageSearch size={34} />}
                  title="No products found"
                  message="Try a different search, or add products first."
                  action={
                    <Button variant="secondary" onClick={() => navigate('/products?new=1')}>
                      Add Product
                    </Button>
                  }
                />
              ) : (
                <div className="product-search-results">
                  {products.map((p) => {
                    const outOfStock = !p.has_variants && p.stock_quantity <= 0;
                    return (
                      <button
                        key={p.id}
                        className="product-tile"
                        onClick={() => addProduct(p)}
                        disabled={outOfStock}
                      >
                        <div className="product-tile__name">{p.name}</div>
                        <div className="product-tile__meta">
                          <span>{p.sku}</span>
                          <Badge tone={outOfStock ? 'danger' : p.stock_quantity <= p.min_stock_level ? 'warning' : 'success'} dot={false}>
                            {p.has_variants
                              ? `${p.variants?.length || 0} variants`
                              : outOfStock
                                ? 'Out of stock'
                                : `${p.stock_quantity} in stock`}
                          </Badge>
                        </div>
                        <div className="product-tile__price">{formatCurrency(p.selling_price, currency)}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </GlassCard>
          </div>
        </div>

        {/* Right: cart */}
        <GlassCard className="cart-panel">
          <CardHeader
            title="Cart"
            icon={<ShoppingCart size={19} />}
            action={
              cart.length > 0 ? (
                <Button variant="ghost" size="sm" onClick={() => setCart([])}>
                  <Trash2 size={14} /> Clear
                </Button>
              ) : null
            }
          />

          {cart.length === 0 ? (
            <EmptyState
              icon={<ShoppingCart size={34} />}
              title="Cart is empty"
              message="Tap products on the left to add them to this bill."
            />
          ) : (
            <>
              <div className="cart-items">
                {cart.map((line) => (
                  <div key={line.key} className="cart-item">
                    <div className="cart-item__info">
                      <div className="cart-item__name">{line.product_name}</div>
                      <div className="cart-item__meta">
                        {line.sku}
                        {line.size && ` • ${line.size}`}
                        {line.color && ` • ${line.color}`}
                      </div>

                      <div className="cart-item__controls">
                        <button className="qty-btn" onClick={() => setQty(line.key, line.quantity - 1)}>
                          −
                        </button>
                        <span className="qty-value">{line.quantity}</span>
                        <button className="qty-btn" onClick={() => setQty(line.key, line.quantity + 1)}>
                          +
                        </button>
                        <button
                          className="qty-btn"
                          style={{ marginLeft: 4 }}
                          onClick={() => removeLine(line.key)}
                          aria-label="Remove item"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="cart-item__controls" style={{ marginTop: 7, gap: 5 }}>
                        <Percent size={13} className="faint" />
                        <input
                          className="input"
                          style={{ width: 64, padding: '4px 8px', fontSize: '0.8rem', textAlign: 'center' }}
                          type="number"
                          min="0"
                          max="100"
                          placeholder="0"
                          value={line.discount_amount}
                          onChange={(e) => setLineDiscount(line.key, e.target.value)}
                          title="Line discount %"
                        />
                        <span className="faint" style={{ fontSize: '0.75rem' }}>% off</span>
                      </div>

                      {line.has_variants && line.variants.length > 0 && (
                        <div className="cart-item__controls" style={{ marginTop: 7 }}>
                          <Select
                            value={line.variant_id || ''}
                            onChange={(e) => swapVariant(line.key, e.target.value)}
                            style={{ width: '100%', padding: '6px 10px', fontSize: '0.8rem' }}
                            options={line.variants.map((v) => ({
                              value: v.id,
                              label: `${v.size || '—'} / ${v.color || '—'} (stock ${v.stock_quantity})`,
                            }))}
                          />
                        </div>
                      )}
                    </div>
                    <div className="cart-item__price">
                      {formatCurrency(
                        line.unit_price * line.quantity * (1 - (line.discount_amount || 0) / 100),
                        currency
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="cart-summary">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>{formatCurrency(totals.subtotal, currency)}</span>
                </div>
                <div className="summary-row">
                  <span>Discount</span>
                  <span style={{ color: 'var(--success)' }}>
                    − {formatCurrency(totals.discountTotal, currency)}
                  </span>
                </div>
                <div className="summary-row">
                  <span className="flex items-center gap-2">
                    Order discount %
                    <input
                      className="input"
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0"
                      value={orderDiscount}
                      onChange={(e) => setOrderDiscount(e.target.value)}
                    />
                  </span>
                  <span className="faint">{totals.orderDiscPct}%</span>
                </div>
                {settings?.tax_enabled && (
                  <div className="summary-row">
                    <span>
                      {settings.tax_label || 'Tax'} ({totals.taxRate}%)
                    </span>
                    <span>{formatCurrency(totals.taxAmt, currency)}</span>
                  </div>
                )}
                <div className="summary-row summary-row--total">
                  <span>Total</span>
                  <span>{formatCurrency(totals.total, currency)}</span>
                </div>
              </div>

              <div className="mt-3">
                <label className="form-label">Payment Method</label>
                <Segmented
                  options={PAYMENT_METHODS.slice(0, 4)}
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  className="mt-2"
                />
                <div className="flex gap-2 mt-2">
                  <Select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    options={PAYMENT_METHODS}
                    style={{ flex: 1 }}
                  />
                  <Select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    options={[
                      { value: 'paid', label: 'Paid' },
                      { value: 'pending', label: 'Pending' },
                      { value: 'partial', label: 'Partial' },
                    ]}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>

              <div className="mt-3">
                <TextArea
                  placeholder="Notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ minHeight: 58 }}
                />
              </div>

              <Button block size="lg" className="mt-3" disabled={!canGenerate} loading={saving} onClick={generateInvoice}>
                <CheckCircle2 size={19} /> Generate Invoice — {formatCurrency(totals.total, currency)}
              </Button>
            </>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
