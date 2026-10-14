import React, { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { FormField, Input, Select, TextArea } from '../ui/Input';
import { useToast } from '../../contexts/ToastContext';
import { adjustStock } from '../../services/inventoryService';
import { validateQuantity, runValidation, hasErrors } from '../../utils/validators';

const REASONS = [
  { value: 'purchase', label: 'New stock received' },
  { value: 'adjustment', label: 'Manual adjustment' },
  { value: 'damage', label: 'Damaged / written off' },
  { value: 'other', label: 'Other' },
];

/** Manual stock adjustment with optional reason + notes (history is kept). */
export default function StockAdjustModal({ open, onClose, product, onSaved }) {
  const [newQty, setNewQty] = useState('0');
  const [reason, setReason] = useState('adjustment');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && product) {
      setNewQty(String(product.stock_quantity ?? 0));
      setReason('adjustment');
      setNotes('');
      setError('');
    }
  }, [open, product]);

  const save = async () => {
    const err = validateQuantity(newQty, 'New quantity', { allowZero: true });
    setError(err || '');
    if (err) return;

    setSaving(true);
    try {
      await adjustStock({
        productId: product.id,
        variantId: null,
        newQty: Number(newQty),
        reason,
        notes: notes.trim(),
      });
      toast.success('Stock updated successfully');
      onSaved?.();
      onClose();
    } catch {
      toast.error('Could not update stock');
    } finally {
      setSaving(false);
    }
  };

  const delta = Number(newQty || 0) - Number(product?.stock_quantity || 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Adjust Stock"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            Update Stock
          </Button>
        </>
      }
    >
      {product && (
        <>
          <div className="detail-grid mb-3">
            <div className="detail-item">
              <div className="detail-item__label">Product</div>
              <div className="detail-item__value">{product.name}</div>
            </div>
            <div className="detail-item">
              <div className="detail-item__label">Current Stock</div>
              <div className="detail-item__value">{product.stock_quantity}</div>
            </div>
          </div>

          <div className="form-grid">
            <FormField label="New Quantity" required error={error}>
              <Input
                type="number"
                min="0"
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
                error={error}
              />
            </FormField>
            <FormField label="Change" hint={delta === 0 ? '—' : delta > 0 ? `+${delta} units` : `${delta} units`}>
              <div
                className="input"
                style={{
                  fontWeight: 800,
                  color: delta > 0 ? 'var(--success)' : delta < 0 ? 'var(--danger)' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {delta > 0 ? `+${delta}` : delta} units
              </div>
            </FormField>
            <FormField label="Reason" className="form-group--full">
              <Select value={reason} onChange={(e) => setReason(e.target.value)} options={REASONS} />
            </FormField>
            <FormField label="Notes" className="form-group--full">
              <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes…" style={{ minHeight: 68 }} />
            </FormField>
          </div>
        </>
      )}
    </Modal>
  );
}
