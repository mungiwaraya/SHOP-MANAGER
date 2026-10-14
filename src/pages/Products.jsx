import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Package, Pencil, Trash2, Eye, EyeOff, MoreVertical, PackageSearch } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import DataTable, { Pagination } from '../components/ui/DataTable';
import SearchBar from '../components/ui/SearchBar';
import { Select } from '../components/ui/Input';
import { ConfirmDialog, Drawer } from '../components/ui/Modal';
import { EmptyState, TableSkeleton, ErrorState, DetailItem } from '../components/ui';
import ProductFormModal from '../components/products/ProductFormModal';
import { useToast } from '../contexts/ToastContext';
import { useShop } from '../contexts/ShopContext';
import {
  listProducts,
  deleteProduct,
  setProductStatus,
  listCategories,
} from '../services/productsService';
import { useDebounce } from '../hooks/useUtilities';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [actionFor, setActionFor] = useState(null);
  const perPage = 12;
  const debounced = useDebounce(search, 320);
  const { toast } = useToast();
  const { currency } = useShop();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listProducts({
        search: debounced,
        categoryId,
        status,
        stockFilter,
        page,
        perPage,
      });
      setProducts(result.products);
      setCount(result.count);
    } catch {
      setError('Could not load products.');
    } finally {
      setLoading(false);
    }
  }, [debounced, categoryId, status, stockFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    listCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setEditing(null);
      setFormOpen(true);
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleDelete = async () => {
    try {
      await deleteProduct(deleting.id);
      toast.success('Product deleted successfully');
      setDeleteOpen(false);
      setDeleting(null);
      load();
    } catch {
      toast.error('Could not delete product');
    }
  };

  const toggleStatus = async (product) => {
    const next = product.status === 'active' ? 'inactive' : 'active';
    try {
      await setProductStatus(product.id, next);
      toast.success(next === 'active' ? 'Product activated' : 'Product marked inactive');
      load();
    } catch {
      toast.error('Could not update product status');
    }
    setActionFor(null);
  };

  const stockBadge = (p) => {
    if (p.stock_quantity === 0) return <Badge tone="danger">Out of stock</Badge>;
    if (p.stock_quantity <= p.min_stock_level) return <Badge tone="warning">Low stock</Badge>;
    return <Badge tone="success">In stock</Badge>;
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header__text">
          <h1>Products</h1>
          <p>Manage your product catalog — including sizes, colors and variants.</p>
        </div>
        <div className="page-actions">
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus size={16} /> Add Product
          </Button>
        </div>
      </div>

      <div className="table-filters">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, SKU or brand…" />
        <Select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setPage(1);
          }}
          placeholder="All categories"
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
        />
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          placeholder="All statuses"
          options={[
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ]}
        />
        <Select
          value={stockFilter}
          onChange={(e) => {
            setStockFilter(e.target.value);
            setPage(1);
          }}
          placeholder="All stock"
          options={[
            { value: 'in', label: 'In stock' },
            { value: 'low', label: 'Low stock' },
            { value: 'out', label: 'Out of stock' },
          ]}
        />
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <TableSkeleton rows={7} />
      ) : products.length === 0 ? (
        <EmptyState
          icon={<PackageSearch size={34} />}
          title={search || categoryId || status || stockFilter ? 'No products match your filters' : 'No products yet'}
          message={
            search || categoryId || status || stockFilter
              ? 'Try adjusting your search or filters.'
              : 'Start adding products to keep track of your inventory and billing.'
          }
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus size={16} /> Add Product
            </Button>
          }
        />
      ) : (
        <>
          <DataTable
            columns={[
              {
                key: 'name',
                label: 'Product',
                render: (p) => (
                  <div className="table__product-cell">
                    <div className="table__thumb">
                      {p.image_url ? <img src={p.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={17} />}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="table__primary">{p.name}</div>
                      <div className="table__secondary">
                        {p.sku}
                        {p.brand ? ` • ${p.brand}` : ''}
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                key: 'category',
                label: 'Category',
                render: (p) => <Badge tone="neutral" dot={false}>{p.category?.name || '—'}</Badge>,
              },
              {
                key: 'selling_price',
                label: 'Price',
                render: (p) => (
                  <div>
                    <strong>{formatCurrency(p.selling_price, currency)}</strong>
                    {Number(p.discount_percent) > 0 && (
                      <div className="table__secondary" style={{ color: 'var(--success)' }}>
                        −{p.discount_percent}%
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'stock_quantity',
                label: 'Stock',
                render: (p) => (
                  <div>
                    <strong>{p.stock_quantity}</strong>
                    {p.has_variants && <div className="table__secondary">{p.variants?.length || 0} variants</div>}
                  </div>
                ),
              },
              { key: 'stock', label: 'Status', render: (p) => stockBadge(p) },
              {
                key: 'created_at',
                label: 'Added',
                render: (p) => <span className="muted">{formatDate(p.created_at)}</span>,
              },
              {
                key: 'actions',
                label: '',
                align: 'right',
                render: (p) => (
                  <div className="table__actions">
                    <button
                      className="icon-btn"
                      onClick={() => {
                        setEditing(p);
                        setFormOpen(true);
                      }}
                      aria-label="Edit product"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="icon-btn"
                      onClick={() => toggleStatus(p)}
                      aria-label="Toggle status"
                      title={p.status === 'active' ? 'Mark inactive' : 'Mark active'}
                    >
                      {p.status === 'active' ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>
                    <button
                      className="icon-btn"
                      onClick={() => {
                        setDeleting(p);
                        setDeleteOpen(true);
                      }}
                      aria-label="Delete product"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ),
              },
            ]}
            rows={products}
          />
          <Pagination page={page} perPage={perPage} total={count} onPageChange={setPage} />
        </>
      )}

      <ProductFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        product={editing}
        onSaved={load}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete product?"
        message={`"${deleting?.name}" will be permanently removed. Past invoices will keep their records. This cannot be undone.`}
        confirmLabel="Delete Product"
      />

      {/* Quick view drawer */}
      <Drawer open={Boolean(viewing)} onClose={() => setViewing(null)} title={viewing?.name || 'Product'}>
        {viewing && (
          <>
            {viewing.image_url && (
              <img
                src={viewing.image_url}
                alt={viewing.name}
                style={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: 16, marginBottom: 18 }}
              />
            )}
            <div className="detail-grid">
              <DetailItem label="SKU" value={viewing.sku} />
              <DetailItem label="Price" value={formatCurrency(viewing.selling_price, currency)} />
              <DetailItem label="Stock" value={viewing.stock_quantity} />
              <DetailItem label="Status" value={viewing.status} />
            </div>
          </>
        )}
      </Drawer>
    </div>
  );
}
