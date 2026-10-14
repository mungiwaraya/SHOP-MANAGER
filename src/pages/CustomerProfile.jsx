import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin, Receipt, Calendar, Pencil } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import DataTable from '../components/ui/DataTable';
import { GlassCard, CardHeader, DetailItem } from '../components/ui/Cards';
import { LoadingState, ErrorState, EmptyState } from '../components/ui/States';
import { getCustomer, getCustomerInvoices, getInvoiceItems } from '../services/customersService';
import { useShop } from '../contexts/ShopContext';
import { formatCurrency, formatDate, formatDateTime } from '../utils/formatters';

export default function CustomerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currency } = useShop();
  const [customer, setCustomer] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, invs] = await Promise.all([getCustomer(id), getCustomerInvoices(id)]);
      setCustomer(c);
      setInvoices(invs);
    } catch {
      setError('Could not load customer profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const toggleItems = async (invoiceId) => {
    if (expanded[invoiceId]) {
      setExpanded((e) => ({ ...e, [invoiceId]: null }));
      return;
    }
    try {
      const items = await getInvoiceItems(invoiceId);
      setExpanded((e) => ({ ...e, [invoiceId]: items }));
    } catch {
      setExpanded((e) => ({ ...e, [invoiceId]: [] }));
    }
  };

  if (loading) return <LoadingState label="Loading customer…" />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!customer) return <ErrorState message="Customer not found." />;

  return (
    <div>
      <div className="page-header">
        <div className="page-header__text">
          <button className="btn btn--ghost btn--sm" onClick={() => navigate('/customers')}>
            <ArrowLeft size={15} /> Back to Customers
          </button>
          <h1 className="mt-2">{customer.name}</h1>
          <p className="flex items-center gap-3 flex-wrap">
            {customer.mobile && (
              <span className="flex items-center gap-1">
                <Phone size={13} /> {customer.mobile}
              </span>
            )}
            {customer.email && (
              <span className="flex items-center gap-1">
                <Mail size={13} /> {customer.email}
              </span>
            )}
            {customer.address && (
              <span className="flex items-center gap-1">
                <MapPin size={13} /> {customer.address}
              </span>
            )}
          </p>
        </div>
        <div className="page-actions">
          <Button variant="secondary" onClick={() => navigate('/billing')}>
            New Bill for {customer.name.split(' ')[0]}
          </Button>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        <GlassCard>
          <DetailItem label="Total Spent" value={formatCurrency(customer.total_purchases, currency)} />
        </GlassCard>
        <GlassCard>
          <DetailItem label="Total Orders" value={customer.total_orders} />
        </GlassCard>
        <GlassCard>
          <DetailItem
            label="Last Purchase"
            value={customer.last_purchase_at ? formatDate(customer.last_purchase_at) : 'No purchases yet'}
          />
        </GlassCard>
        <GlassCard>
          <DetailItem label="Customer Since" value={formatDate(customer.created_at)} />
        </GlassCard>
      </div>

      <div className="mt-4">
        <GlassCard pad={false} style={{ padding: 22 }}>
          <CardHeader title="Purchase History" icon={<Receipt size={19} />} />
          {invoices.length === 0 ? (
            <EmptyState
              icon={<Calendar size={34} />}
              title="No purchases yet"
              message="Invoices for this customer will appear here."
            />
          ) : (
            <DataTable
              columns={[
                {
                  key: 'invoice_number',
                  label: 'Invoice #',
                  render: (r) => (
                    <button
                      className="link"
                      onClick={() => toggleItems(r.id)}
                      style={{ fontWeight: 800 }}
                    >
                      {r.invoice_number}
                    </button>
                  ),
                },
                { key: 'created_at', label: 'Date', render: (r) => formatDateTime(r.created_at) },
                {
                  key: 'products',
                  label: 'Products',
                  render: (r) => {
                    const items = expanded[r.id];
                    if (items === undefined) return <span className="muted">Click invoice # to view</span>;
                    if (items === null) return <span className="muted">—</span>;
                    return (
                      <div>
                        {items.map((it) => (
                          <div key={it.id} className="table__secondary">
                            {it.quantity}× {it.product_name}
                            {it.size ? ` (${it.size})` : ''}
                          </div>
                        ))}
                      </div>
                    );
                  },
                },
                {
                  key: 'total_amount',
                  label: 'Amount',
                  render: (r) => <strong>{formatCurrency(r.total_amount, currency)}</strong>,
                },
                {
                  key: 'payment_method',
                  label: 'Payment',
                  render: (r) => (
                    <Badge tone="neutral" dot={false}>
                      {r.payment_method?.replace('_', ' ')}
                    </Badge>
                  ),
                },
                { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
                {
                  key: 'actions',
                  label: '',
                  align: 'right',
                  render: (r) => (
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/bills?invoice=${r.id}`)}>
                      View
                    </Button>
                  ),
                },
              ]}
              rows={invoices}
            />
          )}
        </GlassCard>
      </div>
    </div>
  );
}
