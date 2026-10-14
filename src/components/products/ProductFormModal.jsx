import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Upload } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { FormField, Input, TextArea, Select, Switch } from '../ui/Input';
import { useToast } from '../../contexts/ToastContext';
import { createProduct, updateProduct, createCategory, listCategories } from '../../services/productsService';
import { uploadShopAsset } from '../../services/settingsService';
import {
  validateRequired,
  validatePrice,
  validateQuantity,
  validateDiscount,
  runValidation,
  hasErrors,
} from '../../utils/validators';

const EMPTY = {
  name: '',
  sku: '',
  category_id: '',
  category_name: '',
  subcategory: '',
  brand: '',
  description: '',
  image_url: '',
  purchase_price: '',
  selling_price: '',
  discount_percent: '0',
  stock_quantity: '0',
  min_stock_level: '5',
  status: 'active',
};

const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

/** Add / edit product with optional size-color variants. */
export default function ProductFormModal({ open, onClose, product, onSaved }) {
  const isEdit = Boolean(product);
  const [form, setForm] = useState(EMPTY);
  const [variants, setVariants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (product) {
      setForm({
        name: product.name || '',
        sku: product.sku || '',
        category_id: product.category_id || '',
        category_name: '',
        subcategory: product.subcategory || '',
        brand: product.brand || '',
        description: product.description || '',
        image_url: product.image_url || '',
        purchase_price: String(product.purchase_price ?? ''),
        selling_price: String(product.selling_price ?? ''),
        discount_percent: String(product.discount_percent ?? '0'),
        stock_quantity: String(product.stock_quantity ?? '0'),
        min_stock_level: String(product.min_stock_level ?? '5'),
        status: product.status || 'active',
      });
      setVariants(
        (product.variants || []).map((v) => ({
          size: v.size || '',
          color: v.color || '',
          stock_quantity: String(v.stock_quantity ?? 0),
          price_override: v.price_override != null ? String(v.price_override) : '',
        }))
      );
    } else {
      setForm(EMPTY);
      setVariants([]);
    }
    listCategories().then(setCategories).catch(() => setCategories([]));
  }, [open, product]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addVariant = () => setVariants((v) => [...v, { size: '', color: '', stock_quantity: '0', price_override: '' }]);

  const updateVariant = (i, patch) =>
    setVariants((vs) => vs.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));

  const removeVariant = (i) => setVariants((vs) => vs.filter((_, idx) => idx !== i));

  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB');
      return;
    }
    setUploading(true);
    try {
      const { url } = await uploadShopAsset(file, 'product');
      set('image_url', url);
      toast.success('Image uploaded');
    } catch {
      toast.error('Could not upload image');
    } finally {
      setUploading(false);
    }
  };

  const validate = () => {
    const errs = runValidation({
      name: () => validateRequired(form.name, 'Product name'),
      sku: () => validateRequired(form.sku, 'SKU'),
      selling_price: () => validatePrice(form.selling_price, 'Selling price', { allowZero: false }),
      purchase_price: () => validatePrice(form.purchase_price, 'Purchase price', { required: false }),
      discount_percent: () => validateDiscount(form.discount_percent),
      stock_quantity: () => validateQuantity(form.stock_quantity, 'Stock quantity', { allowZero: true }),
      min_stock_level: () => validateQuantity(form.min_stock_level, 'Minimum stock level', { allowZero: true }),
    });
    for (let i = 0; i < variants.length; i += 1) {
      const v = variants[i];
      const q = validateQuantity(v.stock_quantity, `Variant ${i + 1} stock`, { allowZero: true });
      if (q) errs[`variant_${i}`] = q;
    }
    setErrors(errs);
    return !hasErrors(errs);
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        category_id: form.category_id || null,
        category_name: form.category_name,
        subcategory: form.subcategory.trim(),
        brand: form.brand.trim(),
        description: form.description.trim(),
        image_url: form.image_url,
        purchase_price: Number(form.purchase_price || 0),
        selling_price: Number(form.selling_price),
        discount_percent: Number(form.discount_percent || 0),
        stock_quantity: Number(form.stock_quantity || 0),
        min_stock_level: Number(form.min_stock_level || 0),
        status: form.status,
        variants: variants
          .filter((v) => v.size || v.color)
          .map((v) => ({
            size: v.size,
            color: v.color,
            stock_quantity: Number(v.stock_quantity || 0),
            price_override: v.price_override === '' ? null : Number(v.price_override),
          })),
      };

      if (isEdit) {
        await updateProduct(product.id, payload);
        toast.success('Product updated successfully');
      } else {
        await createProduct(payload);
        toast.success('Product added successfully');
      }
      onSaved?.();
      onClose();
    } catch (err) {
      const msg = String(err?.message || '');
      toast.error(
        msg.includes('duplicate') || msg.includes('unique')
          ? 'A product with this SKU already exists'
          : 'Could not save product'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Product' : 'Add Product'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} loading={saving}>
            {isEdit ? 'Save Changes' : 'Add Product'}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <FormField label="Product Name" required error={errors.name} className="form-group--full">
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Cotton Round Neck T-Shirt" error={errors.name} />
        </FormField>

        <FormField label="SKU" required error={errors.sku} hint="Unique product code">
          <Input value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="e.g. TSH-001" error={errors.sku} />
        </FormField>

        <FormField label="Category">
          <Select
            value={form.category_id}
            onChange={(e) => set('category_id', e.target.value)}
            placeholder="Select category"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
        </FormField>

        <FormField label="New Category" hint="Create a category on the fly">
          <Input
            value={form.category_name}
            onChange={(e) => set('category_name', e.target.value)}
            placeholder="e.g. T-Shirts"
          />
        </FormField>

        <FormField label="Sub-category">
          <Input value={form.subcategory} onChange={(e) => set('subcategory', e.target.value)} placeholder="e.g. Casual" />
        </FormField>

        <FormField label="Brand">
          <Input value={form.brand} onChange={(e) => set('brand', e.target.value)} placeholder="e.g. Nike" />
        </FormField>

        <FormField label="Status">
          <Select
            value={form.status}
            onChange={(e) => set('status', e.target.value)}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        </FormField>

        <FormField label="Purchase Price (₹)" error={errors.purchase_price}>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.purchase_price}
            onChange={(e) => set('purchase_price', e.target.value)}
            placeholder="0.00"
            error={errors.purchase_price}
          />
        </FormField>

        <FormField label="Selling Price (₹)" required error={errors.selling_price}>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.selling_price}
            onChange={(e) => set('selling_price', e.target.value)}
            placeholder="0.00"
            error={errors.selling_price}
          />
        </FormField>

        <FormField label="Discount (%)" error={errors.discount_percent}>
          <Input
            type="number"
            min="0"
            max="100"
            value={form.discount_percent}
            onChange={(e) => set('discount_percent', e.target.value)}
            error={errors.discount_percent}
          />
        </FormField>

        <FormField label="Stock Quantity" error={errors.stock_quantity}>
          <Input
            type="number"
            min="0"
            value={form.stock_quantity}
            onChange={(e) => set('stock_quantity', e.target.value)}
            error={errors.stock_quantity}
          />
        </FormField>

        <FormField label="Minimum Stock Level" error={errors.min_stock_level} hint="Alert when stock falls to this level">
          <Input
            type="number"
            min="0"
            value={form.min_stock_level}
            onChange={(e) => set('min_stock_level', e.target.value)}
            error={errors.min_stock_level}
          />
        </FormField>

        <FormField label="Product Image" className="form-group--full">
          <div className="flex items-center gap-3 flex-wrap">
            {form.image_url && (
              <img
                src={form.image_url}
                alt="Product"
                style={{ width: 62, height: 62, objectFit: 'cover', borderRadius: 12, border: '1px solid var(--glass-border)' }}
              />
            )}
            <label className="btn btn--secondary btn--sm" style={{ cursor: 'pointer' }}>
              <Upload size={15} /> {uploading ? 'Uploading…' : 'Upload Image'}
              <input type="file" accept="image/*" hidden onChange={handleImage} disabled={uploading} />
            </label>
            <span className="faint" style={{ fontSize: '0.78rem' }}>PNG / JPG / WEBP up to 5 MB</span>
          </div>
        </FormField>

        <FormField label="Description" className="form-group--full">
          <TextArea value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Product description…" />
        </FormField>
      </div>

      {/* Variants */}
      <div className="divider" />
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4>Variants (Size / Color)</h4>
          <span className="faint" style={{ fontSize: '0.8rem' }}>
            Optional — for clothing and any product with options
          </span>
        </div>
        <Button variant="secondary" size="sm" onClick={addVariant}>
          <Plus size={15} /> Add Variant
        </Button>
      </div>

      {variants.length === 0 && (
        <p className="muted" style={{ fontSize: '0.88rem' }}>
          No variants yet. Add variants to track stock per size and color.
        </p>
      )}

      {variants.map((v, i) => (
        <div key={i} className="flex gap-2 items-center flex-wrap mb-2" style={{ padding: '10px 0', borderBottom: '1px solid var(--glass-border)' }}>
          <Select
            value={v.size}
            onChange={(e) => updateVariant(i, { size: e.target.value })}
            placeholder="Size"
            style={{ width: 110 }}
            options={SIZE_OPTIONS.map((s) => ({ value: s, label: s }))}
          />
          <Input
            value={v.color}
            onChange={(e) => updateVariant(i, { color: e.target.value })}
            placeholder="Color"
            style={{ width: 120 }}
          />
          <Input
            type="number"
            min="0"
            value={v.stock_quantity}
            onChange={(e) => updateVariant(i, { stock_quantity: e.target.value })}
            placeholder="Stock"
            style={{ width: 90 }}
            error={errors[`variant_${i}`]}
          />
          <Input
            type="number"
            min="0"
            step="0.01"
            value={v.price_override}
            onChange={(e) => updateVariant(i, { price_override: e.target.value })}
            placeholder="Price override"
            style={{ width: 130 }}
          />
          <button className="icon-btn" onClick={() => removeVariant(i)} aria-label="Remove variant">
            <Trash2 size={15} />
          </button>
        </div>
      ))}
    </Modal>
  );
}
