import React from 'react';
import { ShoppingBag, ExternalLink, ShieldCheck, KeyRound } from 'lucide-react';

/** Shown when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not configured. */
export default function SetupScreen() {
  return (
    <div className="setup-screen">
      <div className="glass-card setup-card">
        <div className="auth-brand">
          <div className="sidebar__logo">
            <ShoppingBag size={26} />
          </div>
          <h1 className="text-gradient">Shop Manager</h1>
          <p className="muted">Connect your Supabase project to get started</p>
        </div>

        <p className="muted" style={{ lineHeight: 1.7 }}>
          This app is fully wired to Supabase for authentication, data and storage. Add your project
          credentials to <strong>.env</strong> and restart the dev server:
        </p>

        <div className="code-block">{`VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key`}</div>

        <div className="setup-steps">
          <div className="setup-step">
            <div className="setup-step__num">1</div>
            <div>
              <strong>Create a Supabase project</strong>
              <div className="muted" style={{ fontSize: '0.875rem' }}>
                Free at{' '}
                <a className="link" href="https://supabase.com" target="_blank" rel="noreferrer">
                  supabase.com <ExternalLink size={12} style={{ display: 'inline' }} />
                </a>
              </div>
            </div>
          </div>
          <div className="setup-step">
            <div className="setup-step__num">2</div>
            <div>
              <strong>Run the SQL migrations</strong>
              <div className="muted" style={{ fontSize: '0.875rem' }}>
                Supabase Dashboard → SQL Editor → run the files in <code>supabase/migrations/</code> in order.
              </div>
            </div>
          </div>
          <div className="setup-step">
            <div className="setup-step__num">
              <KeyRound size={14} />
            </div>
            <div>
              <strong>Copy the API keys</strong>
              <div className="muted" style={{ fontSize: '0.875rem' }}>
                Project Settings → API → copy the <em>Project URL</em> and <em>anon public</em> key into{' '}
                <code>.env</code>. Never use the service_role key in this app.
              </div>
            </div>
          </div>
          <div className="setup-step">
            <div className="setup-step__num">
              <ShieldCheck size={14} />
            </div>
            <div>
              <strong>Create your admin user</strong>
              <div className="muted" style={{ fontSize: '0.875rem' }}>
                Authentication → Users → Add user (email + password). Then sign in on the login screen.
              </div>
            </div>
          </div>
        </div>

        <p className="faint" style={{ fontSize: '0.82rem', textAlign: 'center' }}>
          Full instructions are in the project README.
        </p>
      </div>
    </div>
  );
}
