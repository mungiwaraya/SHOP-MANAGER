import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingBag, Lock, CheckCircle2 } from 'lucide-react';
import Button from '../components/ui/Button';
import { FormField, Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();
  const { updatePassword, session } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!password || password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (password !== confirm) errs.confirm = 'Passwords do not match';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSubmitting(true);
    const result = await updatePassword(password);
    setSubmitting(false);

    if (result.error) {
      setErrors({ password: 'Could not update the password. The link may have expired — request a new one.' });
      return;
    }
    setDone(true);
    toast.success('Password updated successfully');
    setTimeout(() => navigate('/', { replace: true }), 1400);
  };

  return (
    <div className="auth-page">
      <div className="glass-card auth-card">
        <div className="auth-brand">
          <div className="sidebar__logo">
            <ShoppingBag size={26} />
          </div>
          <div>
            <h1 className="text-gradient">Set New Password</h1>
            <p className="muted">
              {session ? 'Choose a strong new password' : 'Open this page from your reset email link'}
            </p>
          </div>
        </div>

        {done ? (
          <div className="text-center" style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
            <CheckCircle2 size={44} color="var(--success)" />
            <h3>Password updated</h3>
            <p className="muted">Taking you to your dashboard…</p>
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <FormField label="New Password" error={errors.password} required>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                icon={<Lock size={17} />}
                error={errors.password}
                autoComplete="new-password"
              />
            </FormField>
            <FormField label="Confirm Password" error={errors.confirm} required>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
                icon={<Lock size={17} />}
                error={errors.confirm}
                autoComplete="new-password"
              />
            </FormField>
            <Button type="submit" block size="lg" loading={submitting}>
              Update Password
            </Button>
            <div className="auth-links">
              <Link className="link" to="/login">
                Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
