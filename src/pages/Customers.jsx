import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Users, Pencil, Trash2, Phone, UserPlus, Mail } from 'lucide-react';
import Button from '../components/ui/Button';
import DataTable, { Pagination } from '../components/ui/DataTable';
import SearchBar from '../components/ui/SearchBar';
import Modal, { ConfirmDialog } from '../components/ui/Modal';
import { FormField, Input, TextArea } from '../components/ui/Input';
import { EmptyState, TableSkeleton, ErrorState } from '../components/ui/States';
import { useToast } from '../contexts/ToastContext';
import { useShop } from '../contexts/ShopContext';
import {
  listCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from '../services/customersService';
import { useDebounce } from '../hooks/useUtilities';
import { formatCurrency, formatDate } from '../utils/formatters';
import { validateMobile, validateRequired, validateEmail, runValidation, hasErrors } from '../utils/validators';

const EMPTY_FORM = { name: '', mobile: '', email: '', address: '', notes: '' };

export default function Customers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [customers, setCustomers] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const perPage = 10;
  const debounced = useDebounce(search, 320);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currency } = useShop();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listCustomers({ search: debounced, page, perPage });
      setCustomers(result.customers);
      setCount(result.count);
    } catch {
      setError('Could not load customers.');
    } finally {
      setLoading(false);
    }
  }, [debounced, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      openCreate();
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setFormOpen(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      name: c.name || '',
      mobile: c.mobile || '',
      email: c.email || '',
      address: c.address || '',
      notes: c.notes || '',
    });
    setErrors({});
    setFormOpen(true);
  };

  const save = async () => {
    const errs = runValidation({
      name: () => validateRequired(form.name, 'Customer name'),
      mobile: () => validateMobile(form.mobile),
      email: () => validateEmail(form.email),
    });
    setErrors(errs);
    if (hasErrors(errs)) return;

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        mobile: form.mobile.replace(/\D/g, ''),
        email: form.email.trim(),
        address: form.address.trim(),
        notes: form.notes.trim(),
      };
      if (editing) {
        await updateCustomer(editing.id, payload);
        toast.success('Customer updated successfully');
      } else {
        await createCustomer(payload);
        toast.success('Customer created successfully');
      }
      setFormOpen(false);
      load();
    } catch (err) {
      const msg = String(err?.message || '');
      toast.error(
        msg.includes('duplicate') || msg.includes('unique')
          ? 'A customer with this mobile number already exists'
          : 'Could not save customer'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCustomer(deleting.id);
      toast.success('Customer deleted successfully');
      setDeleteOpen(false);
      setDeleting(null);
      load();
    } catch {
      toast.error('Could not delete customer');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header__text">
          <h1>Customers</h1>
          <p>Your customer database with purchase history and totals.</p>
        </div>
        <div className="page-actions">
          <Button onClick={openCreate}>
            <Plus size={16} /> Add Customer
          </Button>
        </div>
      </div>

      <div className="table-filters">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by name, mobile or email…" />
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <TableSkeleton rows={6} />
      ) : customers.length === 0 ? (
        <EmptyState
          icon={<Users size={34} />}
          title={search ? 'No customers found' : 'No customers yet'}
          message={
            search
              ? 'Try a different search term.'
              : "Start adding customers to keep track of your shop's purchase history."
          }
          action={
            <Button onClick={openCreate}>
              <UserPlus size={16} /> Add Customer
            </Button>
          }
        />
      ) : (
        <>
          <DataTable
            columns={[
              {
                key: 'name',
                label: 'Customer',
                render: (c) => (
                  <button
                    className="table__cell-strong"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, font: 'inherit', color: 'inherit' }}
                    onClick={() => navigate(`/customers/${c.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="avatar" style={{ width: 38, height: 38 }}>
                        {c.name?.charAt(0)?.toUpperCase() || 'C'}
                      </div>
                      <div>
                        <div>{c.name}</div>
                        <div className="table__secondary flex items-center gap-1">
                          <Phone size={11} /> {c.mobile}
                        </div>
                      </div>
                    </div>
                  </button>
                ),
              },
              {
                key: 'email',
                label: 'Email',
                render: (c) =>
                  c.email ? (
                    <span className="muted flex items-center gap-1">
                      <Mail size={12} /> {c.email}
                    </span>
                  ) : (
                    <span className="faint">—</span>
                  ),
              },
              { key: 'total_orders', label: 'Orders', align: 'center' },
              {
                key: 'total_purchases',
                label: 'Total Spent',
                render: (c) => <strong>{formatCurrency(c.total_purchases, currency)}</strong>,
              },
              {
                key: 'last_purchase_at',
                label: 'Last Purchase',
                render: (c) => <span className="muted">{c.last_purchase_at ? formatDate(c.last_purchase_at) : '—'}</span>,
              },
              {
                key: 'actions',
                label: '',
                align: 'right',
                render: (c) => (
                  <div className="table__actions">
                    <button className="icon-btn" onClick={() => openEdit(c)} aria-label="Edit customer">
                      <Pencil size={15} />
                    </button>
                    <button
                      className="icon-btn"
                      onClick={() => {
                        setDeleting(c);
                        setDeleteOpen(true);
                      }}
                      aria-label="Delete customer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ),
              },
            ]}
            rows={customers}
          />
          <Pagination page={page} perPage={perPage} total={count} onPageChange={setPage} />
        </>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit Customer' : 'Add Customer'}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} loading={saving}>
              {editing ? 'Save Changes' : 'Add Customer'}
            </Button>
          </>
        }
      >
        <div className="form-grid">
          <FormField label="Customer Name" required error={errors.name} className="form-group--full">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Rahul Sharma" error={errors.name} />
          </FormField>
          <FormField label="Mobile Number" required error={errors.mobile} hint="10 digits — used for WhatsApp billing">
            <Input
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
              placeholder="9876543210"
              inputMode="numeric"
              error={errors.mobile}
            />
          </FormField>
          <FormField label="Email" error={errors.email}>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="optional" type="email" error={errors.email} />
          </FormField>
          <FormField label="Address" className="form-group--full">
            <TextArea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="optional" style={{ minHeight: 70 }} />
          </FormField>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete customer?"
        message={`"${deleting?.name}" will be permanently removed from your customer list. Their past invoices will be kept. This cannot be undone.`}
        confirmLabel="Delete Customer"
      />
    </div>
  );
}
