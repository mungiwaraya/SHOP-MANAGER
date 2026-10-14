import React from 'react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { useShop } from '../../contexts/ShopContext';

/** Clean, print-friendly invoice preview (mirrors the generated PDF). */
export default function InvoicePreview({ invoice, items = invoice?.items || [] }) {
  const { settings, currency } = useShop();
  if (!invoice) return null;

  return (
    <div className="invoice-preview">
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
            <div style={{ color: '#6b6b80', fontSize: '0.8rem', lineHeight: 1.6 }}>
              {settings?.address && <div>{settings.address}</div>}
              <div>
                {[settings?.phone, settings?.email].filter(Boolean).join(' • ')}
              </div>
              {[settings?.website, settings?.gstin && `GSTIN: ${settings.gstin}`].filter(Boolean).join(' • ')}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '0.04em' }}>INVOICE</div>
          <div style={{ color: '#6b6b80', fontSize: '0.82rem', lineHeight: 1.7 }}>
            <div>
              <strong>Invoice #:</strong> {invoice.invoice_number}
            </div>
            <div>
              <strong>Date:</strong> {formatDateTime(invoice.created_at)}
            </div>
            <div>
              <strong>Payment:</strong> {String(invoice.payment_method || '').replace('_', ' ').toUpperCase()}
            </div>
            <div>
              <strong>Status:</strong> {String(invoice.status || '').toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', margin: '18px 0' }}>
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.09em', color: '#9a9ab0' }}>BILL TO</div>
          <div style={{ fontWeight: 800, fontSize: '1.02rem', marginTop: 4 }}>{invoice.customer_name || 'Walk-in Customer'}</div>
          <div style={{ color: '#6b6b80', fontSize: '0.83rem', lineHeight: 1.7 }}>
            {invoice.customer_mobile && <div>Mobile: {invoice.customer_mobile}</div>}
            {invoice.customer_email && <div>Email: {invoice.customer_email}</div>}
            {invoice.customer_address && <div>{invoice.customer_address}</div>}
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style={{ width: 32 }}>#</th>
            <th>Product</th>
            <th>SKU</th>
            <th style={{ textAlign: 'center' }}>Qty</th>
            <th style={{ textAlign: 'right' }}>Price</th>
            <th style={{ textAlign: 'right' }}>Discount</th>
            <th style={{ textAlign: 'right' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => (
            <tr key={it.id || i}>
              <td>{i + 1}</td>
              <td>
                <div style={{ fontWeight: 700 }}>{it.product_name}</div>
                {(it.size || it.color) && (
                  <div style={{ color: '#9a9ab0', fontSize: '0.76rem' }}>
                    {[it.size && `Size: ${it.size}`, it.color && `Color: ${it.color}`].filter(Boolean).join(' • ')}
                  </div>
                )}
              </td>
              <td style={{ color: '#6b6b80' }}>{it.sku || '—'}</td>
              <td style={{ textAlign: 'center' }}>{it.quantity}</td>
              <td style={{ textAlign: 'right' }}>{formatCurrency(it.unit_price, currency)}</td>
              <td style={{ textAlign: 'right' }}>
                {it.discount_amount > 0 ? formatCurrency(it.discount_amount, currency) : '—'}
              </td>
              <td style={{ textAlign: 'right', fontWeight: 800 }}>{formatCurrency(it.total_amount, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="invoice-preview__totals">
        <div className="invoice-preview__total-row">
          <span>Subtotal</span>
          <span>{formatCurrency(invoice.subtotal, currency)}</span>
        </div>
        <div className="invoice-preview__total-row">
          <span>Discount</span>
          <span>- {formatCurrency(invoice.discount_amount, currency)}</span>
        </div>
        <div className="invoice-preview__total-row">
          <span>{settings?.tax_label || 'Tax'}</span>
          <span>{formatCurrency(invoice.tax_amount, currency)}</span>
        </div>
        <div className="invoice-preview__total-row invoice-preview__total-row--grand">
          <span>Grand Total</span>
          <span>{formatCurrency(invoice.total_amount, currency)}</span>
        </div>
      </div>

      {invoice.notes && (
        <div style={{ marginTop: 14, color: '#6b6b80', fontSize: '0.82rem', fontStyle: 'italic' }}>Note: {invoice.notes}</div>
      )}

      <div className="invoice-preview__footer">
        <div style={{ fontWeight: 800, color: '#3c3c50' }}>{settings?.invoice_footer || 'Thank you for shopping with us!'}</div>
        {settings?.return_policy && <div style={{ marginTop: 6 }}>Return Policy: {settings.return_policy}</div>}
        <div style={{ marginTop: 8 }}>
          {settings?.shop_name} • {settings?.phone} • {settings?.email}
        </div>
      </div>
    </div>
  );
}
