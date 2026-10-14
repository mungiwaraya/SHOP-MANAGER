import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Button from '../components/ui/Button';
import { FormField, Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import { validateEmail, runValidation, hasErrors } from '../utils/validators';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState('');
  const { sendPasswordReset } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const errs = runValidation({ email: () => validateEmail(email, true) });
    setErrors(errs);
    if (hasErrors(errs)) return;

    setSubmitting(true);
    const result = await sendPasswordReset(email.trim());
    setSubmitting(false);
    if (result.error) {
      setServerError('Could not send the reset email. Please try again.');
      return;
    }
    setSent(true);
  };

  return (
    <div className="auth-page">
      <div className="glass-card auth-card">
        <div className="auth-brand">
          <div className="sidebar__logo">
            <ShoppingBag size={26} />
          </div>
          <div>
            <h1 className="text-gradient">Reset Password</h1>
            <p className="muted">We'll email you a secure reset link</p>
          </div>
        </div>

        {sent ? (
          <div className="text-center" style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
            <CheckCircle2 size={44} color="var(--success)" />
            <h3>Check your inbox</h3>
            <p className="muted" style={{ lineHeight: 1.7 }}>
              If an account exists for <strong>{email}</strong>, a password reset link has been sent.
            </p>
            <Link className="btn btn--primary" to="/login">
              <ArrowLeft size={16} /> Back to Sign In
            </Link>
          </div>
        ) : (
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
                icon={<Mail size={17} />}
                error={errors.email}
              />
            </FormField>
            <Button type="submit" block size="lg" loading={submitting}>
              Send Reset Link
            </Button>
            <div className="auth-links">
              <Link className="link" to="/login">
                <ArrowLeft size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
