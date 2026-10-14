import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  BarChart3,
  PieChart as PieIcon,
  Package,
  IndianRupee,
  Receipt,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { GlassCard, CardHeader, StatCard } from '../components/ui/Cards';
import { Segmented } from '../components/ui/Input';
import { EmptyState, StatGridSkeleton, ErrorState, TableSkeleton } from '../components/ui/States';
import DataTable from '../components/ui/DataTable';
import { useShop } from '../contexts/ShopContext';
import {
  getDashboardStats,
  getRevenueSeries,
  getTopProducts,
  getPaymentBreakdown,
  getMonthlySales,
} from '../services/analyticsService';
import { formatCurrency } from '../utils/formatters';

const PERIODS = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '3 Months' },
  { value: 'year', label: 'This Year' },
];

const PIE_COLORS = ['rgb(var(--primary-rgb))', 'rgb(var(--accent-rgb))', '#16a34a', '#d97706', '#dc2626'];

function ChartTooltip({ active, payload, label, currency }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="glass-card"
      style={{ padding: '10px 14px', fontSize: '0.82rem', background: 'var(--glass-background-strong)' }}
    >
      <div style={{ fontWeight: 800, marginBottom: 3 }}>{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="muted">
          {p.name}: {p.dataKey === 'revenue' || p.dataKey === 'total' ? formatCurrency(p.value, currency) : p.value}
        </div>
      ))}
    </div>
  );
}

export default function Analytics() {
  const { currency } = useShop();
  const [period, setPeriod] = useState('7d');
  const [series, setSeries] = useState([]);
  const [stats, setStats] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [breakdown, setBreakdown] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, tp, pb, ms] = await Promise.all([
        getDashboardStats(),
        getTopProducts(10),
        getPaymentBreakdown(),
        getMonthlySales(),
      ]);
      setStats(s);
      setTopProducts(tp);
      setBreakdown(pb);
      setMonthly(ms);
    } catch {
      setError('Could not load analytics.');
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

  const pieData = breakdown.map((b) => ({
    name: b.method.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    value: Number(b.total),
    count: Number(b.count),
  }));

  return (
    <div>
      <div className="page-header">
        <div className="page-header__text">
          <h1>Analytics</h1>
          <p>Revenue trends, best sellers and payment insights — all from your real sales data.</p>
        </div>
      </div>

      {loading ? (
        <StatGridSkeleton count={4} />
      ) : (
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))' }}>
          <StatCard
            icon={<IndianRupee size={20} />}
            label="Total Revenue"
            value={formatCurrency(stats?.total_revenue || 0, currency)}
            sub="All completed invoices"
            tone="success"
          />
          <StatCard
            icon={<Receipt size={20} />}
            label="Total Orders"
            value={stats?.total_orders || 0}
            sub={`${stats?.completed_orders || 0} completed`}
          />
          <StatCard
            icon={<TrendingUp size={20} />}
            label="Average Order Value"
            value={formatCurrency(
              stats?.completed_orders ? Number(stats.total_revenue) / Number(stats.completed_orders) : 0,
              currency
            )}
            sub="Per completed sale"
          />
          <StatCard
            icon={<Package size={20} />}
            label="Products Sold (Today)"
            value={stats?.today_units || 0}
            sub={`${stats?.today_sales || 0} sales today`}
            tone="info"
          />
        </div>
      )}

      <div className="mt-4">
        <GlassCard className="chart-card">
          <CardHeader
            title="Revenue Trend"
            icon={<TrendingUp size={19} />}
            action={
              <Segmented options={PERIODS} value={period} onChange={setPeriod} />
            }
          />
          <div className="chart-wrap">
            {series.length === 0 ? (
              <EmptyState title="No data for this period" message="Sales in the selected period will appear here." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(var(--primary-rgb))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="rgb(var(--primary-rgb))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 6" stroke="var(--glass-border)" vertical={false} />
                  <XAxis dataKey="bucket" tick={{ fill: 'var(--text-faint)', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} minTickGap={20} />
                  <YAxis tick={{ fill: 'var(--text-faint)', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} width={60} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                  <Tooltip content={<ChartTooltip currency={currency} />} />
                  <Area type="monotone" dataKey="revenue" name="Revenue" stroke="rgb(var(--primary-rgb))" strokeWidth={2.5} fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassCard>
      </div>

      <div className="charts-grid mt-4">
        <GlassCard className="chart-card">
          <CardHeader title="Orders Over Time" icon={<BarChart3 size={19} />} />
          <div className="chart-wrap">
            {series.length === 0 ? (
              <EmptyState title="No orders yet" message="Order counts per period will appear here." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 6" stroke="var(--glass-border)" vertical={false} />
                  <XAxis dataKey="bucket" tick={{ fill: 'var(--text-faint)', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} minTickGap={20} />
                  <YAxis tick={{ fill: 'var(--text-faint)', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} width={40} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ fill: 'var(--hover-surface)' }} />
                  <Bar dataKey="orders" name="Orders" fill="rgb(var(--accent-rgb))" radius={[7, 7, 0, 0]} maxBarSize={38} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassCard>

        <GlassCard className="chart-card">
          <CardHeader title="Payment Methods" icon={<PieIcon size={19} />} />
          <div className="chart-wrap">
            {pieData.length === 0 ? (
              <EmptyState title="No payments yet" message="Payment method breakdown will appear here." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={72} outerRadius={110} paddingAngle={4} strokeWidth={0}>
                    {pieData.map((entry, i) => (
                      <Cell key={entry.name} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip currency={currency} />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassCard>
      </div>

      <div className="charts-grid mt-4">
        <GlassCard className="chart-card">
          <CardHeader title="This Year — Monthly Revenue" icon={<BarChart3 size={19} />} />
          <div className="chart-wrap">
            {monthly.length === 0 ? (
              <EmptyState title="No sales this year" message="Monthly comparison will appear here." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 6" stroke="var(--glass-border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-faint)', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-faint)', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} width={60} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                  <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ fill: 'var(--hover-surface)' }} />
                  <Bar dataKey="revenue" name="Revenue" fill="rgb(var(--primary-rgb))" radius={[7, 7, 0, 0]} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassCard>

        <GlassCard pad={false} style={{ padding: 22 }}>
          <CardHeader title="Top Selling Products" icon={<Package size={19} />} />
          {loading ? (
            <TableSkeleton rows={5} />
          ) : (
            <DataTable
              columns={[
                {
                  key: 'product_name',
                  label: 'Product',
                  render: (p, i) => <span className="table__cell-strong">{p.product_name}</span>,
                },
                { key: 'units', label: 'Units Sold', align: 'center' },
                {
                  key: 'revenue',
                  label: 'Revenue',
                  align: 'right',
                  render: (p) => <strong>{formatCurrency(p.revenue, currency)}</strong>,
                },
              ]}
              rows={topProducts}
              keyExtractor={(p) => p.product_id || p.product_name}
              emptyMessage="No sales data yet"
            />
          )}
        </GlassCard>
      </div>
    </div>
  );
}
