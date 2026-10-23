import React from 'react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { useShop } from '../../contexts/ShopContext';

/** Clean, print-friendly invoice preview — mirrors the generated PDF exactly. */
export default function InvoicePreview({ invoice, items = invoice?.items || [] }) {
  const { settings, currency } = useShop();
  if (!invoice) return null;

  const isOverride = invoice.final_amount_override != null
    && invoice.final_amount_override !== invoice.total_amount;

  const saving = isOverride
    ? (invoice.calculated_amount || 0) - invoice.total_amount
    : 0;

  return (
    <div className="invoice-preview">
      {/* ── Header ── */}
      <div className="invoice-preview__header">
        <div className="flex items-center gap-3">
          <div className="invoice-preview__logo">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              (settings?.shop_name || 'S').charAt(0)
            )}
          </div>
          <div>
            <h3 style={{ fontSize: '1.12rem' }}>{settings?.shop_name || 'My Shop'}</h3>
            {settings?.tagline && (
              <div style={{ color: '#9a9ab0', fontSize: '0.74rem', fontStyle: 'italic', marginBottom: 2 }}>{settings.tagline}</div>
            )}
            <div style={{ color: '#6b6b80', fontSize: '0.78rem', lineHeight: 1.6 }}>
              {settings?.address && <div>{settings.address}</div>}
              <div>{[settings?.phone && `Ph: ${settings.phone}`, settings?.email].filter(Boolean).join('   •   ')}</div>
              {[settings?.website, settings?.gstin && `GSTIN: ${settings.gstin}`].filter(Boolean).join('   •   ')}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '0.06em', color: '#0f0f16' }}>INVOICE</div>
          <div style={{ color: '#6b6b80', fontSize: '0.8rem', lineHeight: 1.9, marginTop: 4 }}>
            <div><span style={{ color: '#9a9ab0', fontSize: '0.72rem' }}>Invoice #</span><br /><strong style={{ color: '#0f0f16', fontSize: '0.88rem' }}>{invoice.invoice_number}</strong></div>
            <div style={{ marginTop: 3 }}><span style={{ color: '#9a9ab0', fontSize: '0.72rem' }}>Date</span><br />{formatDateTime(invoice.created_at)}</div>
          </div>
        </div>
      </div>

      {/* ── Bill To + Payment Details ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, margin: '18px 0' }}>
        {/* Bill To */}
        <div style={{ background: '#f8f8fb', borderRadius: 10, padding: '14px 16px', border: '1px solid #e8e8f0' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.1em', color: '#9a9ab0', textTransform: 'uppercase', marginBottom: 6 }}>Bill To</div>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f0f16', marginBottom: 4 }}>{invoice.customer_name || 'Walk-in Customer'}</div>
          <div style={{ color: '#6b6b80', fontSize: '0.8rem', lineHeight: 1.8 }}>
            {invoice.customer_mobile && <div>📱 {invoice.customer_mobile}</div>}
            {invoice.customer_email && <div>✉️ {invoice.customer_email}</div>}
            {invoice.customer_address && <div>📍 {invoice.customer_address}</div>}
          </div>
        </div>
        {/* Payment Details */}
        <div style={{ background: '#f8f8fb', borderRadius: 10, padding: '14px 16px', border: '1px solid #e8e8f0' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.1em', color: '#9a9ab0', textTransform: 'uppercase', marginBottom: 6 }}>Payment Details</div>
          <div style={{ color: '#3c3c50', fontSize: '0.82rem', lineHeight: 2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9a9ab0' }}>Method</span>
              <strong>{String(invoice.payment_method || '').replace(/_/g, ' ').toUpperCase()}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9a9ab0' }}>Status</span>
              <strong style={{ color: invoice.payment_status === 'paid' ? '#16a34a' : invoice.payment_status === 'pending' ? '#d97706' : '#3c3c50' }}>
                {String(invoice.payment_status || '').toUpperCase()}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#9a9ab0' }}>Invoice Status</span>
              <strong>{String(invoice.status || '').toUpperCase()}</strong>
            </div>
            {invoice.transaction_reference && (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ color: '#9a9ab0', whiteSpace: 'nowrap' }}>TXN / Ref</span>
                <strong style={{ wordBreak: 'break-all', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.78rem' }}>{invoice.transaction_reference}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Items Table ── */}
      <table>
        <thead>
          <tr>
            <th style={{ width: 28, textAlign: 'center' }}>#</th>
            <th>Product / Description</th>
            <th style={{ textAlign: 'center', width: 44 }}>Qty</th>
            <th style={{ textAlign: 'right', width: 80 }}>Unit Price</th>
            <th style={{ textAlign: 'right', width: 80 }}>Discount</th>
            <th style={{ textAlign: 'right', width: 88 }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={it.id || i}>
              <td style={{ textAlign: 'center', color: '#9a9ab0', fontWeight: 700 }}>{i + 1}</td>
              <td>
                <div style={{ fontWeight: 700, color: '#16161d' }}>{it.product_name}</div>
                {(it.size || it.color) && (
                  <div style={{ color: '#9a9ab0', fontSize: '0.73rem', marginTop: 1 }}>
                    {[it.size && `Size: ${it.size}`, it.color && `Color: ${it.color}`].filter(Boolean).join(' • ')}
                  </div>
                )}
                {it.sku && <div style={{ color: '#b5b5c8', fontSize: '0.7rem' }}>SKU: {it.sku}</div>}
              </td>
              <td style={{ textAlign: 'center', fontWeight: 800 }}>{it.quantity}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(it.unit_price, currency)}</td>
              <td style={{ textAlign: 'right', color: '#16a34a' }}>
                {it.discount_amount > 0 ? `- ${formatCurrency(it.discount_amount, currency)}` : '—'}
              </td>
              <td style={{ textAlign: 'right', fontWeight: 800, color: '#0f0f16' }}>
                {formatCurrency(it.total_amount, currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Totals ── */}
      <div className="invoice-preview__totals">
        <div className="invoice-preview__total-row">
          <span>Subtotal</span>
          <span>{formatCurrency(invoice.subtotal, currency)}</span>
        </div>
        {invoice.discount_amount > 0 && (
          <div className="invoice-preview__total-row">
            <span>Discount</span>
            <span style={{ color: '#16a34a' }}>- {formatCurrency(invoice.discount_amount, currency)}</span>
          </div>
        )}
        {invoice.tax_amount > 0 && (
          <div className="invoice-preview__total-row">
            <span>{settings?.tax_label || 'Tax'}</span>
            <span>{formatCurrency(invoice.tax_amount, currency)}</span>
          </div>
        )}
        {isOverride && (
          <div className="invoice-preview__total-row" style={{ opacity: 0.55, textDecoration: 'line-through', fontSize: '0.85rem' }}>
            <span>Calculated Total</span>
            <span>{formatCurrency(invoice.calculated_amount || 0, currency)}</span>
          </div>
        )}
        <div className="invoice-preview__total-row invoice-preview__total-row--grand" style={{ color: isOverride ? '#3c64f0' : '#16161d' }}>
          <span>{isOverride ? '🤝 Negotiated Total' : 'Grand Total'}</span>
          <span>{formatCurrency(invoice.total_amount, currency)}</span>
        </div>
        {isOverride && saving > 0 && (
          <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#16a34a', fontStyle: 'italic', marginTop: 3 }}>
            Customer saved {formatCurrency(saving, currency)}
          </div>
        )}
      </div>

      {/* ── Notes ── */}
      {invoice.notes && (
        <div style={{ marginTop: 16, padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, color: '#78620a', fontSize: '0.8rem', fontStyle: 'italic' }}>
          📝 Note: {invoice.notes}
        </div>
      )}

      {/* ── Footer ── */}
      <div className="invoice-preview__footer">
        <div style={{ fontWeight: 800, color: '#0f0f16', fontSize: '0.92rem', textAlign: 'center', marginBottom: 8 }}>
          {settings?.invoice_footer || 'Thank you for shopping with us!'}
        </div>
        {settings?.return_policy && (
          <div style={{ fontSize: '0.76rem', marginBottom: 6, color: '#6b6b80' }}>
            <strong>Return Policy:</strong> {settings.return_policy}
          </div>
        )}
        <div style={{ borderTop: '1px solid #ececf1', paddingTop: 10, marginTop: 8, textAlign: 'center', fontSize: '0.76rem', color: '#9a9ab0' }}>
          {[settings?.shop_name, settings?.phone, settings?.email, settings?.website].filter(Boolean).join('   •   ')}
        </div>
      </div>
    </div>
  );
}
