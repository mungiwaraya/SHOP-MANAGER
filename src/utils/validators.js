/** Frontend validation helpers — messages are user-friendly. */

export function validateMobile(mobile) {
  const clean = String(mobile || '').replace(/\D/g, '');
  if (!clean) return 'Mobile number is required';
  if (clean.length !== 10) return 'Mobile number must be exactly 10 digits';
  return null;
}

export function validateEmail(email, required = false) {
  const clean = String(email || '').trim();
  if (!clean) return required ? 'Email is required' : null;
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
  return ok ? null : 'Enter a valid email address';
}

export function validateRequired(value, label = 'This field') {
  if (value === null || value === undefined) return `${label} is required`;
  if (typeof value === 'string' && !value.trim()) return `${label} is required`;
  return null;
}

export function validatePrice(value, label = 'Price', { required = true, allowZero = true } = {}) {
  const clean = String(value ?? '').trim();
  if (!clean) return required ? `${label} is required` : null;
  const n = Number(clean);
  if (Number.isNaN(n)) return `${label} must be a valid number`;
  if (n < 0) return `${label} cannot be negative`;
  if (!allowZero && n === 0) return `${label} must be greater than zero`;
  return null;
}

export function validateQuantity(value, label = 'Quantity', { allowZero = false } = {}) {
  const clean = String(value ?? '').trim();
  if (!clean) return `${label} is required`;
  const n = Number(clean);
  if (!Number.isInteger(n)) return `${label} must be a whole number`;
  if (n < 0) return `${label} cannot be negative`;
  if (!allowZero && n === 0) return `${label} must be at least 1`;
  return null;
}

export function validateDiscount(value) {
  const clean = String(value ?? '').trim();
  if (!clean) return null;
  const n = Number(clean);
  if (Number.isNaN(n) || n < 0 || n > 100) return 'Discount must be between 0 and 100';
  return null;
}

/** Run a map of { fieldName: validatorFn } and return errors object */
export function runValidation(validators) {
  const errors = {};
  for (const [field, fn] of Object.entries(validators)) {
    const msg = fn();
    if (msg) errors[field] = msg;
  }
  return errors;
}

export function hasErrors(errors) {
  return Object.keys(errors || {}).length > 0;
}
