import React from 'react';

/**
 * Button — primary | secondary | ghost | danger | danger-solid | success
 * sizes: sm | md | lg, optional block / icon-only.
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  iconOnly = false,
  loading = false,
  disabled = false,
  className = '',
  children,
  ...rest
}) {
  const classes = [
    'btn',
    `btn--${variant}`,
    size !== 'md' && `btn--${size}`,
    block && 'btn--block',
    iconOnly && 'btn--icon',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} disabled={disabled || loading} {...rest}>
      {loading && <span className="spinner" style={{ width: 15, height: 15, borderWidth: 2 }} />}
      {children}
    </button>
  );
}
