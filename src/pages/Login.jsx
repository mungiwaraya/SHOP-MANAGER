import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingBag, Mail, Lock, Eye, EyeOff, FlaskConical } from 'lucide-react';
import Button from '../components/ui/Button';
import { FormField, Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import { useShop } from '../contexts/ShopContext';
import { isDemoMode } from '../lib/supabase';
import { validateEmail, runValidation, hasErrors } from '../utils/validators';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { settings, shopName } = useShop();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const errs = runValidation({
      email: () => validateEmail(email, true),
      password: () => (password ? null : 'Password is required'),
    });
    setErrors(errs);
    if (hasErrors(errs)) return;

    setSubmitting(true);
    const result = await signIn(email.trim(), password);
    setSubmitting(false);
    if (result.error) {
      setServerError(
        result.error.includes('Invalid login credentials')
          ? 'Incorrect email or password. Please try again.'
          : 'Could not sign in. Please check your connection and try again.'
      );
      return;
    }
    navigate('/', { replace: true });
  };

  return (
    <div className="auth-page">
      <div className="glass-card auth-card">
        <div className="auth-brand">
          <div className="sidebar__logo">
            {settings?.logo_url ? <img src={settings.logo_url} alt="Logo" /> : <ShoppingBag size={26} />}
          </div>
          <div>
            <h1 className="text-gradient">{shopName}</h1>
            <p className="muted">Sign in to your Shop Manager dashboard</p>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {serverError && (
            <div
              className="glass-card"
              style={{ padding: '12px 15px', borderColor: 'rgb(var(--danger-rgb) / 0.35)', color: 'var(--danger)', fontSize: '0.885rem', fontWeight: 650 }}
            >
              {serverError}
            </div>
          )}

          <FormField label="Email" error={errors.email} required>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@yourshop.com"
              autoComplete="email"
              icon={<Mail size={17} />}
              error={errors.email}
            />
          </FormField>

          <FormField label="Password" error={errors.password} required>
            <Input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              icon={<Lock size={17} />}
              error={errors.password}
              suffix={
                <button
                  type="button"
                  className="icon-btn"
                  style={{ width: 32, height: 32, border: 'none', background: 'transparent' }}
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />
          </FormField>

          <Button type="submit" block size="lg" loading={submitting}>
            Sign In
          </Button>

          <div className="auth-links">
            <Link className="link" to="/forgot-password">
              Forgot password?
            </Link>
            <span className="faint">Secure admin access</span>
          </div>

          {isDemoMode && (
            <div
              className="glass-card"
              style={{ padding: '13px 15px', borderColor: 'rgb(var(--warning-rgb) / 0.35)', fontSize: '0.845rem', display: 'flex', gap: 10, alignItems: 'flex-start' }}
            >
              <FlaskConical size={17} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Demo mode — sample data.</strong>
                <div className="muted" style={{ marginTop: 2 }}>
                  Enter any email & password to explore the full app.{' '}
                  <Link className="link" to="/setup">
                    Connect your Supabase project →
                  </Link>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
