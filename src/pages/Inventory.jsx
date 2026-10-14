import React, { useCallback, useEffect, useState } from 'react';
import { Boxes, PackagePlus, SlidersHorizontal, AlertTriangle, PackageX, History, TrendingUp } from 'lucide-react';
import { GlassCard, CardHeader, StatCard } from '../components/ui/Cards';
import DataTable, { Pagination } from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import SearchBar from '../components/ui/SearchBar';
import { Tabs } from '../components/ui/SearchBar';
import { EmptyState, TableSkeleton, ErrorState } from '../components/ui/States';
import StockAdjustModal from '../components/inventory/StockAdjustModal';
import { useShop } from '../contexts/ShopContext';
import {
  listInventoryTransactions,
  getLowStockProducts,
  getRecentProducts,
} from '../services/inventoryService';
import { listProducts } from '../services/productsService';
import { useDebounce } from '../hooks/useUtilities';
import { formatCurrency, formatDateTime, formatDate } from '../utils/formatters';

export default function Inventory() {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [recent, setRecent] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [txCount, setTxCount] = useState(0);
  const [txSearch, setTxSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adjusting, setAdjusting] = useState(null);
  const perPage = 12;
  const debouncedTx = useDebounce(txSearch, 320);
  const { currency } = useShop();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { getDashboardStats } = await import('../services/analyticsService');
      const [s, low, rec] = await Promise.all([
        getDashboardStats(),
        getLowStockProducts(15),
        getRecentProducts(6),
      ]);
      setStats(s);
      setLowStock(low);
      setRecent(rec);
    } catch {
      setError('Could not load inventory data.');
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const result = await listInventoryTransactions({ search: debouncedTx, page, perPage });
      setTransactions(result.transactions);
      setTxCount(result.count);
    } catch {
      setTransactions([]);
    } finally {
      setTxLoading(false);
    }
  }, [debouncedTx, page]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  return (
    <div>
      <div className="page-header">
        <div className="page-header__text">
          <h1>Inventory</h1>
          <p>Stock levels, valuation and full movement history for every product.</p>
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <>
          <div className="stats-grid">
            <StatCard
              icon={<Boxes size={20} />}
              label="Stock Value"
              value={stats ? formatCurrency(stats.stock_value, currency) : '—'}
              sub="Purchase value of all stock"
            />
            <StatCard
              icon={<TrendingUp size={20} />}
              label="Total Products"
              value={stats?.total_products ?? '—'}
              sub="Active products"
            />
            <StatCard
              icon={<AlertTriangle size={20} />}
              label="Low Stock"
              value={stats?.low_stock ?? '—'}
              sub="At or below minimum"
              tone="warning"
            />
            <StatCard
              icon={<PackageX size={20} />}
              label="Out of Stock"
              value={stats?.out_of_stock ?? '—'}
              sub="Reorder soon"
              tone="danger"
            />
          </div>

          <div className="mt-4">
            <Tabs
              tabs={[
                { value: 'overview', label: 'Overview' },
                { value: 'history', label: 'Stock History', count: txCount },
              ]}
              active={tab}
              onChange={setTab}
            />
          </div>

          {tab === 'overview' && (
            <div className="charts-grid">
              <GlassCard>
                <CardHeader title="Low Stock Alerts" icon={<AlertTriangle size={19} />} />
                {loading ? (
                  <TableSkeleton rows={4} />
                ) : lowStock.length === 0 ? (
                  <EmptyState
                    title="All good!"
                    message="No products are below their minimum stock level right now."
                  />
                ) : (
                  <div className="activity-list">
                    {lowStock.map((p) => (
                      <div key={p.id} className="activity-item">
                        <div
                          className="activity-item__dot"
                          style={{
                            background:
                              p.stock_quantity === 0
                                ? 'rgb(var(--danger-rgb) / 0.13)'
                                : 'rgb(var(--warning-rgb) / 0.13)',
                            color: p.stock_quantity === 0 ? 'var(--danger)' : 'var(--warning)',
                          }}
                        >
                          {p.stock_quantity === 0 ? <PackageX size={17} /> : <AlertTriangle size={17} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="activity-item__text">{p.name}</div>
                          <div className="activity-item__time">
                            {p.sku} • Min level {p.min_stock_level}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge tone={p.stock_quantity === 0 ? 'danger' : 'warning'}>
                            {p.stock_quantity} left
                          </Badge>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setAdjusting(p)}
                          >
                            <SlidersHorizontal size={14} /> Adjust
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>

              <GlassCard>
                <CardHeader title="Recently Added" icon={<PackagePlus size={19} />} />
                {loading ? (
                  <TableSkeleton rows={4} />
                ) : recent.length === 0 ? (
                  <EmptyState title="No products yet" message="Newly added products will appear here." />
                ) : (
                  <div className="activity-list">
                    {recent.map((p) => (
                      <div key={p.id} className="activity-item">
                        <div className="activity-item__dot">
                          <Boxes size={17} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="activity-item__text">{p.name}</div>
                          <div className="activity-item__time">
                            {p.sku} • Added {formatDate(p.created_at)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <strong>{formatCurrency(p.selling_price, currency)}</strong>
                          <Button variant="secondary" size="sm" onClick={() => setAdjusting(p)}>
                            <SlidersHorizontal size={14} /> Adjust
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            </div>
          )}

          {tab === 'history' && (
            <GlassCard>
              <div className="table-filters">
                <SearchBar
                  value={txSearch}
                  onChange={(v) => {
                    setTxSearch(v);
                    setPage(1);
                  }}
                  placeholder="Search by product, reason or notes…"
                />
              </div>
              {txLoading ? (
                <TableSkeleton rows={6} />
              ) : (
                <>
                  <DataTable
                    columns={[
                      {
                        key: 'product',
                        label: 'Product',
                        render: (t) => (
                          <div>
                            <div className="table__cell-strong">{t.product?.name || '—'}</div>
                            <div className="table__secondary">{t.product?.sku}</div>
                          </div>
                        ),
                      },
                      {
                        key: 'change',
                        label: 'Change',
                        render: (t) => (
                          <strong
                            style={{
                              color: t.change > 0 ? 'var(--success)' : t.change < 0 ? 'var(--danger)' : 'var(--text-muted)',
                            }}
                          >
                            {t.change > 0 ? `+${t.change}` : t.change}
                          </strong>
                        ),
                      },
                      { key: 'previous_qty', label: 'Before' },
                      { key: 'new_qty', label: 'After' },
                      {
                        key: 'reason',
                        label: 'Reason',
                        render: (t) => (
                          <Badge
                            tone={
                              t.reason === 'sale'
                                ? 'info'
                                : t.reason === 'return' || t.reason === 'cancellation'
                                  ? 'warning'
                                  : 'neutral'
                            }
                            dot={false}
                          >
                            {t.reason}
                          </Badge>
                        ),
                      },
                      {
                        key: 'notes',
                        label: 'Notes',
                        render: (t) => <span className="muted">{t.notes || '—'}</span>,
                      },
                      {
                        key: 'created_at',
                        label: 'Date',
                        render: (t) => <span className="muted">{formatDateTime(t.created_at)}</span>,
                      },
                    ]}
                    rows={transactions}
                    emptyMessage="No stock movements recorded yet"
                  />
                  <Pagination page={page} perPage={perPage} total={txCount} onPageChange={setPage} />
                </>
              )}
            </GlassCard>
          )}
        </>
      )}

      <StockAdjustModal
        open={Boolean(adjusting)}
        onClose={() => setAdjusting(null)}
        product={adjusting}
        onSaved={() => {
          load();
          loadTransactions();
        }}
      />
    </div>
  );
}
