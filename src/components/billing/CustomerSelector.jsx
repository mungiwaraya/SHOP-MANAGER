import React, { useEffect, useRef, useState } from 'react';
import { UserPlus, X, User } from 'lucide-react';
import { useDebounce } from '../../hooks/useUtilities';
import { searchCustomersLite, createCustomer } from '../../services/customersService';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { FormField, Input, TextArea } from '../ui/Input';
import { validateMobile, validateRequired, hasErrors, runValidation } from '../../utils/validators';

/**
 * POS customer picker:
 *  - search existing customers (debounced)
 *  - quick-create a new customer inline
 *  - walk-in customer fallback
 */
export default function CustomerSelector({ selected, onSelect }) {
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', mobile: '', email: '', address: '' });
  const [errors, setErrors] = useState({});
  const wrapRef = useRef(null);
  const debounced = useDebounce(query, 250);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    searchCustomersLite(debounced, 7)
      .then((rows) => active && setOptions(rows))
      .catch(() => active && setOptions([]));
    return () => {
      active = false;
    };
  }, [debounced, open]);

  useEffect(() => {
    const onClickAway = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, []);

  const saveCustomer = async () => {
    const errs = runValidation({
      name: () => validateRequired(form.name, 'Customer name'),
      mobile: () => validateMobile(form.mobile),
    });
    setErrors(errs);
    if (hasErrors(errs)) return;

    setSaving(true);
    try {
      const created = await createCustomer({
        name: form.name.trim(),
        mobile: form.mobile.replace(/\D/g, ''),
        email: form.email.trim(),
        address: form.address.trim(),
      });
      toast.success('Customer created successfully');
      onSelect(created);
      setCreating(false);
      setForm({ name: '', mobile: '', email: '', address: '' });
    } catch (err) {
      toast.error(err.message?.includes('duplicate') || err.message?.includes('unique') ? 'A customer with this mobile number already exists' : 'Could not create customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div className="flex gap-2">
        {selected ? (
          <div className="flex items-center gap-2 w-full" style={{ padding: '10px 13px', borderRadius: 'var(--radius-md)', border: '1px solid rgb(var(--primary-rgb) / 0.35)', background: 'rgb(var(--primary-rgb) / 0.07)' }}>
            <User size={17} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 750, fontSize: '0.92rem' }}>{selected.name}</div>
              <div className="faint" style={{ fontSize: '0.78rem' }}>
                {selected.mobile || 'No mobile'}
              </div>
            </div>
            <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => onSelect(null)} aria-label="Clear customer">
              <X size={14} />
            </button>
          </div>
        ) : (
          <>
            <div className="input-wrap" style={{ flex: 1 }}>
              <span className="input-wrap__icon">
                <User size={16} />
              </span>
              <input
                className="input"
                placeholder="Search customer by name or mobile…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
              />
            </div>
            <Button variant="secondary" size="sm" onClick={() => setCreating(true)}>
              <UserPlus size={15} /> New
            </Button>
          </>
        )}
      </div>

      {open && !selected && (
        <div className="selector-dropdown">
          <button
            className="selector-option"
            onClick={() => {
              onSelect({ name: 'Walk-in Customer', mobile: '' });
              setOpen(false);
            }}
          >
            <div>
              <div className="selector-option__name">Walk-in Customer</div>
              <div className="selector-option__meta">No details required</div>
            </div>
          </button>
          {options.map((c) => (
            <button
              key={c.id}
              className="selector-option"
              onClick={() => {
                onSelect(c);
                setOpen(false);
                setQuery('');
              }}
            >
              <div>
                <div className="selector-option__name">{c.name}</div>
                <div className="selector-option__meta">
                  {c.mobile} • {c.total_orders} orders
                </div>
              </div>
            </button>
          ))}
          {options.length === 0 && query.trim() && (
            <div className="selector-option" style={{ cursor: 'default' }}>
              <div className="muted" style={{ fontSize: '0.86rem' }}>
                No customers found. Create one with “New”.
              </div>
            </div>
          )}
        </div>
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="New Customer"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button onClick={saveCustomer} loading={saving}>
              Save Customer
            </Button>
          </>
        }
      >
        <div className="form-grid">
          <FormField label="Customer Name" required error={errors.name} className="form-group--full">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Rahul Sharma"
              error={errors.name}
            />
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
            <Input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="optional"
              type="email"
            />
          </FormField>
          <FormField label="Address" className="form-group--full">
            <TextArea
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="optional"
              style={{ minHeight: 70 }}
            />
          </FormField>
        </div>
      </Modal>
    </div>
  );
}
