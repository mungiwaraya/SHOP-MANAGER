import React from 'react';
import { Inbox, AlertTriangle, RefreshCw } from 'lucide-react';

export function LoadingState({ label = 'Loading…' }) {
  return (
    <div className="loading-center">
      <div className="spinner spinner--lg" />
      <span>{label}</span>
    </div>
  );
}

export function Skeleton({ variant = 'text', width = '100%', height, count = 1 }) {
  const rows = Array.from({ length: count });
  return (
    <>
      {rows.map((_, i) => (
        <div
          key={i}
          className={`skeleton skeleton--${variant}`}
          style={{
            width: variant === 'text' && count > 1 ? `${85 + ((i * 7) % 15)}%` : width,
            height,
          }}
        />
      ))}
    </>
  );
}

export function StatGridSkeleton({ count = 8 }) {
  return (
    <div className="stats-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton skeleton--card" />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 6 }) {
  return (
    <div className="table-wrap" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 42, borderRadius: 10 }} />
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, message, action }) {
  return (
    <div className="glass-card empty-state">
      <div className="empty-state__icon">{icon || <Inbox size={34} />}</div>
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div className="glass-card error-state">
      <AlertTriangle size={34} color="var(--danger)" />
      <h3>Oops</h3>
      <p className="muted">{message}</p>
      {onRetry && (
        <button className="btn btn--secondary" onClick={onRetry}>
          <RefreshCw size={16} /> Try again
        </button>
      )}
    </div>
  );
}
