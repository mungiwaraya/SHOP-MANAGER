import React from 'react';
import { Link } from 'react-router-dom';
import { FlaskConical, X } from 'lucide-react';
import { isDemoMode } from '../lib/supabase';
import { resetDemoDb } from '../lib/demoDb';
import { useToast } from '../contexts/ToastContext';

/** Honest demo banner — visible ONLY while running without Supabase credentials. */
export default function DemoBanner() {
  const [dismissed, setDismissed] = React.useState(false);
  const { toast } = useToast();

  if (!isDemoMode || dismissed) return null;

  return (
    <div
      style={{
        background: 'rgb(var(--warning-rgb) / 0.13)',
        borderBottom: '1px solid rgb(var(--warning-rgb) / 0.3)',
        color: 'var(--text-color)',
      }}
    >
      <div
        className="flex items-center gap-2 flex-wrap"
        style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: '9px 32px', fontSize: '0.82rem', fontWeight: 650 }}
      >
        <FlaskConical size={15} style={{ color: 'var(--warning)', flexShrink: 0 }} />
        <span>
          <strong>Demo mode</strong> — sample data on this device. Connect Supabase to run your real shop.
        </span>
        <span className="flex items-center gap-2" style={{ marginLeft: 'auto' }}>
          <Link className="link" to="/setup" style={{ fontSize: '0.82rem' }}>
            Setup guide
          </Link>
          <button
            className="link"
            style={{ fontSize: '0.82rem' }}
            onClick={() => {
              resetDemoDb();
              toast.success('Demo data reset');
              window.location.reload();
            }}
          >
            Reset demo data
          </button>
          <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => setDismissed(true)} aria-label="Dismiss">
            <X size={13} />
          </button>
        </span>
      </div>
    </div>
  );
}
