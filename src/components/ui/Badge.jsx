import React from 'react';

const TONE_MAP = {
  completed: 'success',
  paid: 'success',
  active: 'success',
  in_stock: 'success',
  pending: 'warning',
  partial: 'warning',
  low_stock: 'warning',
  cancelled: 'danger',
  out_of_stock: 'danger',
  returned: 'info',
  inactive: 'neutral',
};

/** Status badge — tone inferred from status text unless overridden. */
export default function Badge({ children, tone, dot = true }) {
  const resolved = tone || TONE_MAP[children] || 'neutral';
  return (
    <span className={`badge badge--${resolved}`}>
      {dot && <span className="badge__dot" />}
      {children}
    </span>
  );
}
