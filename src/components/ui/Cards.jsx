import React from 'react';

export function GlassCard({ children, pad = true, interactive = false, className = '', style, onClick }) {
  return (
    <div
      className={`glass-card ${pad ? 'glass-card--pad' : ''} ${interactive ? 'glass-card--interactive' : ''} ${className}`}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, icon, action, children }) {
  return (
    <div className="card-header">
      <h3>
        {icon}
        {title}
      </h3>
      {action}
      {children}
    </div>
  );
}

/** StatCard — dashboard analytics tile. tone: default | success | warning | danger | info */
export function StatCard({ icon, label, value, sub, tone = 'default' }) {
  return (
    <div className="glass-card glass-card--interactive stat-card">
      <div className="stat-card__top">
        <div className={`stat-card__icon ${tone !== 'default' ? `stat-card__icon--${tone}` : ''}`}>{icon}</div>
      </div>
      <div>
        <div className="stat-card__label">{label}</div>
        <div className="stat-card__value">{value}</div>
        {sub && <div className="stat-card__sub">{sub}</div>}
      </div>
    </div>
  );
}

export function DetailItem({ label, value }) {
  return (
    <div className="detail-item">
      <div className="detail-item__label">{label}</div>
      <div className="detail-item__value">{value ?? '—'}</div>
    </div>
  );
}
