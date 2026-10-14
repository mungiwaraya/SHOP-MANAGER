import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IndianRupee,
  Receipt,
  TrendingUp,
  Users,
  Package,
  AlertTriangle,
  PackageX,
  Clock,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Plus,
  ScanBarcode,
  Boxes,
  ArrowRight,
  Activity,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { GlassCard, CardHeader, StatCard } from '../components/ui/Cards';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import DataTable from '../components/ui/DataTable';
import { StatGridSkeleton, EmptyState, ErrorState } from '../components/ui/States';
import { useShop } from '../contexts/ShopContext';
import { getDashboardStats, getRevenueSeries, getTopProducts, getRecentActivity } from '../services/analyticsService';
import { recentTransactions } from '../services/invoicesService';
import { formatCurrency, timeAgo, formatDateTime } from '../utils/formatters';

const PERIODS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '3 Months' },
  { value: 'year', label: 'This Year' },
];

const ACTIVITY_ICONS = {
  invoice_created: Receipt,
  invoice_returned: RotateCcw,
  invoice_cancelled: XCircle,
  product_added: Package,
  customer_added: Users,
  stock_updated: Boxes,
  default: Activity,
};

function CustomTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="glass-card"
      style={{ padding: '10px 14px', fontSize: '0.82rem', background: 'var(--glass-background-strong)' }}
    >
      <div style={{ fontWeight: 800, marginBottom: 3 }}>{label}</div>
      <div className="muted">Revenue: {formatCurrency(payload[0].value, currency)}</div>
      {payload[0].payload.orders !== undefined && (
        <div className="muted">Orders: {payload[0].payload.orders}</div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { currency, shopName, settings } = useShop();
  const [stats, setStats] = useState(null);
  const [series, setSeries] = useState([]);
  const [period, setPeriod] = useState('7d');
  const [topProducts, setTopProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, t, tp, act] = await Promise.all([
        getDashboardStats(),
        recentTransactions(7),
        getTopProducts(5),
        getRecentActivity(7),
      ]);
      setStats(s);
      setTransactions(t);
      setTopProducts(tp);
      setActivity(act);
    } catch {
      setError('Could not load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const loadSeries = async (p) => {
    try {
      setSeries(await getRevenueSeries(p));
    } catch {
      setSeries([]);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadSeries(period);
  }, [period]);

  if (error) return <ErrorState message={error} onRetry={load} />;

  const statValue = (fn, fallback = 0) => (stats ? fn(stats) : fallback);

  return (
    <div>
      <div className="page-header">
        <div className="page-header__text">
          <h1>
            Welcome back{settings ? '' : ''} 👋
          </h1>
          <p>
            Here's what's happening at <strong>{shopName}</strong> today.
          </p>
        </div>
        <div className="page-actions">
          <Button variant="secondary" onClick={() => navigate('/billing')}>
            <ScanBarcode size={16} /> New Bill
          </Button>
          <Button onClick={() => navigate('/products?new=1')}>
            <Plus size={16} /> Add Product
          </Button>
        </div>
      </div>

      {loading ? (
        <StatGridSkeleton count={8} />
      ) : (
        <>
          <div className="stats-grid">
            <StatCard
              icon={<TrendingUp size={20} />}
              label="Today's Sales"
              value={statValue((s) => s.today_sales)}
              sub={`${statValue((s) => s.today_units)} units sold`}
            />
            <StatCard
              icon={<Receipt size={20} />}
              label="Today's Orders"
              value={statValue((s) => s.today_orders)}
              sub="All invoices today"
            />
            <StatCard
              icon={<IndianRupee size={20} />}
              label="Today's Revenue"
              value={formatCurrency(statValue((s) => s.today_revenue), currency)}
              sub="Completed payments"
              tone="success"
            />
            <StatCard
              icon={<TrendingUp size={20} />}
              label="Total Revenue"
              value={formatCurrency(statValue((s) => s.total_revenue), currency)}
              sub={`${statValue((s) => s.total_orders)} total invoices`}
            />
            <StatCard
              icon={<Users size={20} />}
              label="Total Customers"
              value={statValue((s) => s.total_customers)}
              sub="In your database"
            />
            <StatCard
              icon={<Package size={20} />}
              label="Total Products"
              value={statValue((s) => s.total_products)}
              sub="Active products"
            />
            <StatCard
              icon={<AlertTriangle size={20} />}
              label="Low Stock"
              value={statValue((s) => s.low_stock)}
              sub="At or below minimum level"
              tone="warning"
            />
            <StatCard
              icon={<PackageX size={20} />}
              label="Out of Stock"
              value={statValue((s) => s.out_of_stock)}
              sub="Needs restocking"
              tone="danger"
            />
            <StatCard
              icon={<Clock size={20} />}
              label="Pending Payments"
              value={formatCurrency(statValue((s) => s.pending_payments), currency)}
              sub={`${statValue((s) => s.pending_count)} invoices pending`}
              tone="warning"
            />
            <StatCard
              icon={<CheckCircle2 size={20} />}
              label="Completed Orders"
              value={statValue((s) => s.completed_orders)}
              sub="Successfully closed"
              tone="success"
            />
            <StatCard
              icon={<XCircle size={20} />}
              label="Cancelled Orders"
              value={statValue((s) => s.cancelled_orders)}
              sub="Stock restored"
              tone="danger"
            />
            <StatCard
              icon={<RotateCcw size={20} />}
              label="Returned Orders"
              value={statValue((s) => s.returned_orders)}
              sub="Stock restored"
              tone="info"
            />
          </div>

          {/* Quick actions */}
          <div className="mt-4">
            <GlassCard>
              <CardHeader title="Quick Actions" icon={<Plus size={19} />} />
              <div className="quick-actions">
                <button className="quick-action" onClick={() => navigate('/billing')}>
                  <div className="quick-action__icon">
                    <ScanBarcode size={20} />
                  </div>
                  <div>
                    <div className="quick-action__title">New Bill</div>
                    <div className="quick-action__sub">Create invoice & take payment</div>
                  </div>
                </button>
                <button className="quick-action" onClick={() => navigate('/products?new=1')}>
                  <div className="quick-action__icon">
                    <Plus size={20} />
                  </div>
                  <div>
                    <div className="quick-action__title">Add Product</div>
                    <div className="quick-action__sub">Add a new product to your shop</div>
                  </div>
                </button>
                <button className="quick-action" onClick={() => navigate('/customers?new=1')}>
                  <div className="quick-action__icon">
                    <Users size={20} />
                  </div>
                  <div>
                    <div className="quick-action__title">Add Customer</div>
                    <div className="quick-action__sub">Save a customer for billing</div>
                  </div>
                </button>
                <button className="quick-action" onClick={() => navigate('/bills')}>
                  <div className="quick-action__icon">
                    <Receipt size={20} />
                  </div>
                  <div>
                    <div className="quick-action__title">View Bills</div>
                    <div className="quick-action__sub">All invoices & payments</div>
                  </div>
                </button>
                <button className="quick-action" onClick={() => navigate('/inventory')}>
                  <div className="quick-action__icon">
                    <Boxes size={20} />
                  </div>
                  <div>
                    <div className="quick-action__title">Inventory</div>
                    <div className="quick-action__sub">Stock levels & adjustments</div>
                  </div>
                </button>
              </div>
            </GlassCard>
          </div>

          {/* Revenue chart */}
          <div className="mt-4">
            <GlassCard className="chart-card">
              <CardHeader
                title="Revenue Overview"
                icon={<TrendingUp size={19} />}
                action={
                  <div className="segmented">
                    {PERIODS.map((p) => (
                      <button
                        key={p.value}
                        className={`segmented__item ${period === p.value ? 'active' : ''}`}
                        onClick={() => setPeriod(p.value)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                }
              />
              <div className="chart-wrap">
                {series.length === 0 ? (
                  <EmptyState
                    icon={<TrendingUp size={34} />}
                    title="No revenue data yet"
                    message="Complete your first sale to see the revenue trend here."
                  />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgb(var(--primary-rgb))" stopOpacity={0.32} />
                          <stop offset="100%" stopColor="rgb(var(--primary-rgb))" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 6" stroke="var(--glass-border)" vertical={false} />
                      <XAxis
                        dataKey="bucket"
                        tick={{ fill: 'var(--text-faint)', fontSize: 11, fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                        minTickGap={24}
                      />
                      <YAxis
                        tick={{ fill: 'var(--text-faint)', fontSize: 11, fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                        width={64}
                        tickFormatter={(v) =>
                          v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                        }
                      />
                      <Tooltip content={<CustomTooltip currency={currency} />} cursor={{ stroke: 'var(--border-color)' }} />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="rgb(var(--primary-rgb))"
                        strokeWidth={2.5}
                        fill="url(#revenueFill)"
                        animationDuration={700}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </GlassCard>
          </div>

          <div className="charts-grid mt-4">
            {/* Top products */}
            <GlassCard>
              <CardHeader
                title="Top Selling Products"
                icon={<Package size={19} />}
                action={
                  <Button variant="ghost" size="sm" onClick={() => navigate('/analytics')}>
                    View all <ArrowRight size={14} />
                  </Button>
                }
              />
              {topProducts.length === 0 ? (
                <EmptyState title="No sales yet" message="Top products will appear here after your first invoice." />
              ) : (
                <div className="activity-list">
                  {topProducts.map((p, i) => (
                    <div key={p.product_id || i} className="activity-item">
                      <div className="activity-item__dot" style={{ background: 'rgb(var(--primary-rgb) / 0.12)', fontWeight: 800 }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="activity-item__text">{p.product_name}</div>
                        <div className="activity-item__time">
                          {Number(p.units)} units sold
                        </div>
                      </div>
                      <div style={{ fontWeight: 800 }}>{formatCurrency(p.revenue, currency)}</div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* Recent activity */}
            <GlassCard>
              <CardHeader title="Recent Activity" icon={<Activity size={19} />} />
              {activity.length === 0 ? (
                <EmptyState title="Nothing here yet" message="Actions like creating invoices and adding products will show up here." />
              ) : (
                <div className="activity-list">
                  {activity.map((a) => {
                    const Icon = ACTIVITY_ICONS[a.action_type] || ACTIVITY_ICONS.default;
                    return (
                      <div key={a.id} className="activity-item">
                        <div className="activity-item__dot">
                          <Icon size={17} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="activity-item__text">{a.description}</div>
                          <div className="activity-item__time">{timeAgo(a.created_at)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </GlassCard>
          </div>

          {/* Recent transactions */}
          <div className="mt-4">
            <GlassCard pad={false} className="chart-card" style={{ padding: 22 }}>
              <CardHeader
                title="Recent Transactions"
                icon={<Receipt size={19} />}
                action={
                  <Button variant="ghost" size="sm" onClick={() => navigate('/bills')}>
                    View all <ArrowRight size={14} />
                  </Button>
                }
              />
              <DataTable
                columns={[
                  {
                    key: 'invoice_number',
                    label: 'Invoice #',
                    render: (r) => <span className="table__cell-strong">{r.invoice_number}</span>,
                  },
                  { key: 'customer_name', label: 'Customer' },
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
                  { key: 'created_at', label: 'Date', render: (r) => formatDateTime(r.created_at) },
                  { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
                ]}
                rows={transactions}
                emptyMessage="No transactions yet"
              />
            </GlassCard>
          </div>
        </>
      )}
    </div>
  );
}
