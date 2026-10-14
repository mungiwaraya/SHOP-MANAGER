import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ReceiptText,
  Pencil,
  Trash2,
  Eye,
  Filter,
  RotateCcw,
  XCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import DataTable, { Pagination } from '../components/ui/DataTable';
import SearchBar from '../components/ui/SearchBar';
import { Select, TextArea } from '../components/ui/Input';
import Modal, { ConfirmDialog, Drawer } from '../components/ui/Modal';
import { EmptyState, TableSkeleton, ErrorState } from '../components/ui/States';
import { DetailItem } from '../components/ui/Cards';
import InvoicePreview from '../components/invoices/InvoicePreview';
import InvoiceActions from '../components/invoices/InvoiceActions';
import { useToast } from '../contexts/ToastContext';
import { useShop } from '../contexts/ShopContext';
import {
  listInvoices,
  getInvoice,
  updateInvoiceStatus,
  deleteInvoice,
} from '../services/invoicesService';
import { useDebounce } from '../hooks/useUtilities';
import { formatCurrency, formatDateTime } from '../utils/formatters';

const STATUSES = ['completed', 'pending', 'cancelled', 'returned'];
const METHODS = ['cash', 'upi', 'card', 'bank_transfer', 'other'];

export default function Bills() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [statusFor, setStatusFor] = useState(null);
  const [newStatus, setNewStatus] = useState('returned');
  const [statusReason, setStatusReason] = useState('');
  const [statusOpen, setStatusOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingBusy, setDeletingBusy] = useState(false);
  const perPage = 12;
  const debounced = useDebounce(search, 320);
  const { toast } = useToast();
  const { currency } = useShop();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listInvoices({
        search: debounced,
        status,
        paymentMethod: method,
        dateFrom: dateFrom ? new Date(`${dateFrom}T00:00:00`).toISOString() : '',
        dateTo: dateTo ? new Date(`${dateTo}T23:59:59.999`).toISOString() : '',
        page,
        perPage,
      });
      setInvoices(result.invoices);
      setCount(result.count);
    } catch {
      setError('Could not load invoices.');
    } finally {
      setLoading(false);
    }
  }, [debounced, status, method, dateFrom, dateTo, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Deep link: /bills?invoice=<id>
  useEffect(() => {
    const invoiceId = searchParams.get('invoice');
    if (invoiceId) {
      openInvoice(invoiceId);
      searchParams.delete('invoice');
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const openInvoice = async (id) => {
    setViewLoading(true);
    try {
      const full = await getInvoice(id);
      setViewing(full);
    } catch {
      toast.error('Could not load invoice');
    } finally {
      setViewLoading(false);
    }
  };

  const openStatusChange = (invoice, status) => {
    setStatusFor(invoice);
    setNewStatus(status);
    setStatusReason('');
    setStatusOpen(true);
  };

  const applyStatus = async () => {
    try {
      await updateInvoiceStatus(statusFor.id, newStatus, statusReason.trim());
      toast.success(`Invoice marked ${newStatus}`);
      setStatusOpen(false);
      setStatusFor(null);
      if (viewing?.id === statusFor.id) {
        setViewing(await getInvoice(statusFor.id));
      }
      load();
    } catch {
      toast.error('Could not update invoice status');
    }
  };

  const handleDelete = async () => {
    setDeletingBusy(true);
    try {
      await deleteInvoice(deleting);
      toast.success('Invoice deleted');
      setDeleteOpen(false);
      setDeleting(null);
      setViewing(null);
      load();
    } catch {
      toast.error('Could not delete invoice');
    } finally {
      setDeletingBusy(false);
    }
  };

  const statusActions = (inv) => (
    <div className="table__actions">
      <button className="icon-btn" onClick={() => openInvoice(inv.id)} aria-label="View invoice">
        <Eye size={15} />
      </button>
      {inv.status === 'completed' && (
        <>
          <button
            className="icon-btn"
            onClick={() => openStatusChange(inv, 'returned')}
            aria-label="Mark returned"
            title="Mark as returned"
          >
            <RotateCcw size={15} />
          </button>
          <button
            className="icon-btn"
            onClick={() => openStatusChange(inv, 'cancelled')}
            aria-label="Cancel invoice"
            title="Cancel invoice"
          >
            <XCircle size={15} />
          </button>
        </>
      )}
      {inv.status !== 'completed' && (
        <button
          className="icon-btn"
          onClick={() => openStatusChange(inv, 'completed')}
          aria-label="Mark completed"
          title="Mark as completed"
        >
          <CheckCircle2 size={15} />
        </button>
      )}
      <button
        className="icon-btn"
        onClick={() => {
          setDeleting(inv);
          setDeleteOpen(true);
        }}
        aria-label="Delete invoice"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div className="page-header__text">
          <h1>Bills</h1>
          <p>Every invoice, payment and status — download, print or share on WhatsApp.</p>
        </div>
      </div>

      <div className="table-filters">
        <SearchBar
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search invoice #, customer or mobile…"
        />
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          placeholder="All statuses"
          options={STATUSES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))}
        />
        <Select
          value={method}
          onChange={(e) => {
            setMethod(e.target.value);
            setPage(1);
          }}
          placeholder="All payments"
          options={METHODS.map((m) => ({ value: m, label: m.replace('_', ' ') }))}
        />
        <input
          className="input"
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(1);
          }}
          style={{ width: 'auto' }}
          aria-label="From date"
        />
        <input
          className="input"
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(1);
          }}
          style={{ width: 'auto' }}
          aria-label="To date"
        />
        {(status || method || dateFrom || dateTo || search) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatus('');
              setMethod('');
              setDateFrom('');
              setDateTo('');
              setSearch('');
              setPage(1);
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : loading ? (
        <TableSkeleton rows={7} />
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={<ReceiptText size={34} />}
          title={search || status || method || dateFrom || dateTo ? 'No invoices match your filters' : 'No invoices yet'}
          message={
            search || status || method || dateFrom || dateTo
              ? 'Try changing or clearing the filters.'
              : 'Generated invoices will appear here with PDF and WhatsApp actions.'
          }
        />
      ) : (
        <>
          <DataTable
            columns={[
              {
                key: 'invoice_number',
                label: 'Invoice #',
                render: (r) => <span className="table__cell-strong">{r.invoice_number}</span>,
              },
              {
                key: 'customer_name',
                label: 'Customer',
                render: (r) => (
                  <div>
                    <div>{r.customer_name}</div>
                    {r.customer_mobile && <div className="table__secondary">{r.customer_mobile}</div>}
                  </div>
                ),
              },
              { key: 'created_at', label: 'Date', render: (r) => formatDateTime(r.created_at) },
              {
                key: 'total_amount',
                label: 'Amount',
                render: (r) => <strong>{formatCurrency(r.total_amount, currency)}</strong>,
              },
              {
                key: 'payment_method',
                label: 'Payment',
                render: (r) => (
                  <div>
                    <Badge tone="neutral" dot={false}>
                      {r.payment_method?.replace('_', ' ')}
                    </Badge>
                    {r.payment_status === 'pending' && (
                      <div className="table__secondary" style={{ color: 'var(--warning)' }}>
                        payment pending
                      </div>
                    )}
                  </div>
                ),
              },
              { key: 'status', label: 'Status', render: (r) => <Badge>{r.status}</Badge> },
              { key: 'actions', label: '', align: 'right', render: statusActions },
            ]}
            rows={invoices}
          />
          <Pagination page={page} perPage={perPage} total={count} onPageChange={setPage} />
        </>
      )}

      {/* Invoice detail drawer */}
      <Drawer
        open={Boolean(viewing) || viewLoading}
        onClose={() => setViewing(null)}
        title={viewing ? `Invoice ${viewing.invoice_number}` : 'Invoice'}
      >
        {viewLoading ? (
          <TableSkeleton rows={5} />
        ) : viewing ? (
          <>
            <div className="detail-grid mb-3">
              <DetailItem label="Customer" value={viewing.customer_name} />
              <DetailItem label="Mobile" value={viewing.customer_mobile || '—'} />
              <DetailItem label="Date" value={formatDateTime(viewing.created_at)} />
              <DetailItem label="Amount" value={formatCurrency(viewing.total_amount, currency)} />
              <DetailItem label="Payment" value={viewing.payment_method?.replace('_', ' ')} />
              <DetailItem label="Status" value={<Badge>{viewing.status}</Badge>} />
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              <InvoiceActions invoice={viewing} compact />
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
              {viewing.status === 'completed' ? (
                <>
                  <Button variant="secondary" size="sm" onClick={() => openStatusChange(viewing, 'returned')}>
                    <RotateCcw size={14} /> Mark Returned
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => openStatusChange(viewing, 'cancelled')}>
                    <XCircle size={14} /> Cancel Invoice
                  </Button>
                </>
              ) : (
                <Button variant="success" size="sm" onClick={() => openStatusChange(viewing, 'completed')}>
                  <CheckCircle2 size={14} /> Restore to Completed
                </Button>
              )}
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  setDeleting(viewing);
                  setDeleteOpen(true);
                }}
              >
                <Trash2 size={14} /> Delete
              </Button>
            </div>

            <InvoicePreview invoice={viewing} />
          </>
        ) : null}
      </Drawer>

      {/* Status change modal */}
      <Modal
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        title={`Mark invoice as ${newStatus}`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setStatusOpen(false)}>
              Cancel
            </Button>
            <Button onClick={applyStatus} variant={newStatus === 'completed' ? 'primary' : 'danger-solid'}>
              Confirm {newStatus}
            </Button>
          </>
        }
      >
        <p className="confirm-text mb-3">
          {newStatus === 'returned' || newStatus === 'cancelled'
            ? 'Stock for all items in this invoice will be returned to inventory and the sale will be recorded as ' +
              newStatus +
              '. The invoice is kept in your history.'
            : 'This invoice will be marked completed and stock will be treated as sold again.'}
        </p>
        <TextArea
          placeholder="Reason (optional) — e.g. customer changed mind, damaged item…"
          value={statusReason}
          onChange={(e) => setStatusReason(e.target.value)}
          style={{ minHeight: 70 }}
        />
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        loading={deletingBusy}
        title="Delete invoice?"
        message={
          deleting?.status === 'completed' || deleting?.status === 'pending'
            ? `"${deleting?.invoice_number}" will be cancelled first (stock restored and customer totals corrected), then permanently deleted. This cannot be undone.`
            : `"${deleting?.invoice_number}" will be permanently deleted. This cannot be undone.`
        }
        confirmLabel="Delete Invoice"
      />
    </div>
  );
}
