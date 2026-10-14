import React from 'react';

export function FormField({ label, error, hint, required = false, children, className = '' }) {
  return (
    <div className={`form-group ${className}`}>
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="req">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

export function Input({ error, icon, suffix, className = '', ...rest }) {
  const field = <input className={`input ${error ? 'has-error' : ''} ${className}`} {...rest} />;
  if (icon || suffix) {
    return (
      <div className="input-wrap">
        {icon && <span className="input-wrap__icon">{icon}</span>}
        {field}
        {suffix && <span className="input-wrap__suffix">{suffix}</span>}
      </div>
    );
  }
  return field;
}

export function TextArea({ error, className = '', ...rest }) {
  return <textarea className={`textarea ${error ? 'has-error' : ''} ${className}`} {...rest} />;
}

export function Select({ error, options = [], placeholder, className = '', children, ...rest }) {
  return (
    <select className={`select ${error ? 'has-error' : ''} ${className}`} {...rest}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
      {children}
    </select>
  );
}

export function Switch({ checked, onChange, id, disabled = false }) {
  return (
    <label className="switch" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="switch__track" />
    </label>
  );
}

export function Segmented({ options, value, onChange, className = '' }) {
  return (
    <div className={`segmented ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`segmented__item ${value === o.value ? 'active' : ''}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
