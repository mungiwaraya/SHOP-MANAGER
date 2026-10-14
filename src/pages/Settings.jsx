import React, { useEffect, useState } from 'react';
import {
  Store,
  Palette,
  ReceiptText,
  UserCog,
  Upload,
  Save,
  Lock,
  Sun,
  Moon,
} from 'lucide-react';
import { GlassCard, CardHeader } from '../components/ui/Cards';
import Button from '../components/ui/Button';
import { FormField, Input, TextArea, Select, Switch, Segmented } from '../components/ui/Input';
import { Tabs } from '../components/ui/SearchBar';
import { LoadingState } from '../components/ui/States';
import { useToast } from '../contexts/ToastContext';
import { useShop } from '../contexts/ShopContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { updateProfile, uploadShopAsset } from '../services/settingsService';

const PRESET_COLORS = [
  { value: '#111114', label: 'Black' },
  { value: '#2563eb', label: 'Blue' },
  { value: '#7c3aed', label: 'Purple' },
  { value: '#16a34a', label: 'Green' },
  { value: '#ea580c', label: 'Orange' },
  { value: '#dc2626', label: 'Red' },
];

const ACCENT_COLORS = ['#5b7cfa', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4'];

export default function Settings() {
  const [tab, setTab] = useState('shop');
  const { settings, saveSettings, loading } = useShop();
  const { user, profile, updatePassword, refreshProfile } = useAuth();
  const { theme, setTheme, mode, toggleMode } = useTheme();
  const { toast } = useToast();

  const [shopForm, setShopForm] = useState(null);
  const [invoiceForm, setInvoiceForm] = useState(null);
  const [appearance, setAppearance] = useState({ primary_color: '#111114', accent_color: '#5b7cfa', border_radius: '16px' });
  const [profileForm, setProfileForm] = useState({ full_name: '' });
  const [passwordForm, setPasswordForm] = useState({ password: '', confirm: '' });
  const [savingShop, setSavingShop] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setShopForm({
      shop_name: settings.shop_name || '',
      tagline: settings.tagline || '',
      address: settings.address || '',
      phone: settings.phone || '',
      email: settings.email || '',
      website: settings.website || '',
      gstin: settings.gstin || '',
      logo_url: settings.logo_url || '',
    });
    setInvoiceForm({
      invoice_prefix: settings.invoice_prefix || 'INV-',
      invoice_footer: settings.invoice_footer || '',
      return_policy: settings.return_policy || '',
      currency_symbol: settings.currency_symbol || '₹',
      currency_code: settings.currency_code || 'INR',
      tax_enabled: Boolean(settings.tax_enabled),
      tax_rate: String(settings.tax_rate ?? 0),
      tax_label: settings.tax_label || 'GST',
    });
    setAppearance({
      primary_color: settings.primary_color || theme.primary_color,
      accent_color: settings.accent_color || theme.accent_color,
      border_radius: settings.border_radius || theme.border_radius,
    });
  }, [settings, theme]);

  useEffect(() => {
    if (profile) setProfileForm({ full_name: profile.full_name || '' });
  }, [profile]);

  const saveShop = async () => {
    if (!shopForm.shop_name.trim()) {
      toast.error('Shop name is required');
      return;
    }
    setSavingShop(true);
    try {
      await saveSettings(shopForm);
      toast.success('Settings updated successfully');
    } catch {
      toast.error('Could not save shop profile');
    } finally {
      setSavingShop(false);
    }
  };

  const saveInvoice = async () => {
    setSavingInvoice(true);
    try {
      await saveSettings({
        ...invoiceForm,
        tax_rate: Number(invoiceForm.tax_rate || 0),
      });
      toast.success('Invoice settings updated');
    } catch {
      toast.error('Could not save invoice settings');
    } finally {
      setSavingInvoice(false);
    }
  };

  const saveAppearance = async (patch) => {
    const next = { ...appearance, ...patch };
    setAppearance(next);
    // Apply instantly + persist
    setTheme({ theme_mode: mode, primary_color: next.primary_color, accent_color: next.accent_color, border_radius: next.border_radius });
    try {
      await saveSettings({ theme_mode: mode, ...next });
      toast.success('Theme saved to your account');
    } catch {
      toast.error('Could not save theme');
    }
  };

  const saveMode = async (newMode) => {
    setTheme({ theme_mode: newMode });
    try {
      await saveSettings({ theme_mode: newMode });
    } catch {
      /* theme still applied locally */
    }
  };

  const saveProfileInfo = async () => {
    if (!profileForm.full_name.trim()) {
      toast.error('Name is required');
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile({ full_name: profileForm.full_name.trim() });
      await refreshProfile();
      toast.success('Profile updated successfully');
    } catch {
      toast.error('Could not update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    if (!passwordForm.password || passwordForm.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (passwordForm.password !== passwordForm.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setSavingPassword(true);
    const result = await updatePassword(passwordForm.password);
    setSavingPassword(false);
    if (result.error) {
      toast.error('Could not update password');
      return;
    }
    setPasswordForm({ password: '', confirm: '' });
    toast.success('Password updated successfully');
  };

  const handleLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo must be under 5 MB');
      return;
    }
    setUploadingLogo(true);
    try {
      const { url } = await uploadShopAsset(file, 'logo');
      setShopForm((f) => ({ ...f, logo_url: url }));
      await saveSettings({ logo_url: url });
      toast.success('Logo updated across the app');
    } catch {
      toast.error('Could not upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  if (loading || !shopForm || !invoiceForm) return <LoadingState label="Loading settings…" />;

  return (
    <div>
      <div className="page-header">
        <div className="page-header__text">
          <h1>Settings</h1>
          <p>Shop profile, branding, invoice configuration and your admin account.</p>
        </div>
      </div>

      <Tabs
        tabs={[
          { value: 'shop', label: 'Shop Profile' },
          { value: 'appearance', label: 'Appearance' },
          { value: 'invoice', label: 'Invoice Settings' },
          { value: 'profile', label: 'Profile' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'shop' && (
        <GlassCard>
          <CardHeader title="Shop Profile" icon={<Store size={19} />} />
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <div className="sidebar__logo" style={{ width: 76, height: 76, borderRadius: 20 }}>
              {shopForm.logo_url ? <img src={shopForm.logo_url} alt="Shop logo" /> : <Store size={30} />}
            </div>
            <div>
              <label className="btn btn--secondary btn--sm" style={{ cursor: 'pointer' }}>
                <Upload size={15} /> {uploadingLogo ? 'Uploading…' : 'Change Logo'}
                <input type="file" accept="image/*" hidden onChange={handleLogo} disabled={uploadingLogo} />
              </label>
              <div className="faint mt-2" style={{ fontSize: '0.78rem' }}>
                Appears in the sidebar, dashboard, invoices and PDFs. PNG / JPG / SVG up to 5 MB.
              </div>
            </div>
          </div>

          <div className="form-grid">
            <FormField label="Shop Name" required>
              <Input value={shopForm.shop_name} onChange={(e) => setShopForm({ ...shopForm, shop_name: e.target.value })} />
            </FormField>
            <FormField label="Tagline">
              <Input value={shopForm.tagline} onChange={(e) => setShopForm({ ...shopForm, tagline: e.target.value })} placeholder="e.g. Fashion for everyone" />
            </FormField>
            <FormField label="Address" className="form-group--full">
              <TextArea value={shopForm.address} onChange={(e) => setShopForm({ ...shopForm, address: e.target.value })} style={{ minHeight: 70 }} />
            </FormField>
            <FormField label="Phone">
              <Input value={shopForm.phone} onChange={(e) => setShopForm({ ...shopForm, phone: e.target.value })} placeholder="e.g. 9876543210" />
            </FormField>
            <FormField label="Email">
              <Input value={shopForm.email} onChange={(e) => setShopForm({ ...shopForm, email: e.target.value })} type="email" />
            </FormField>
            <FormField label="Website">
              <Input value={shopForm.website} onChange={(e) => setShopForm({ ...shopForm, website: e.target.value })} placeholder="https://yourshop.com" />
            </FormField>
            <FormField label="GSTIN (optional)">
              <Input value={shopForm.gstin} onChange={(e) => setShopForm({ ...shopForm, gstin: e.target.value })} placeholder="e.g. 22AAAAA0000A1Z5" />
            </FormField>
          </div>

          <div className="flex justify-between items-center mt-4">
            <span />
            <Button onClick={saveShop} loading={savingShop}>
              <Save size={16} /> Save Shop Profile
            </Button>
          </div>
        </GlassCard>
      )}

      {tab === 'appearance' && (
        <GlassCard>
          <CardHeader title="Appearance" icon={<Palette size={19} />} />

          <div className="switch-row">
            <div>
              <strong>Theme Mode</strong>
              <div className="muted" style={{ fontSize: '0.875rem' }}>
                Light or dark — saved to your account and follows you across devices.
              </div>
            </div>
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => {
                const next = mode === 'dark' ? 'light' : 'dark';
                toggleMode();
                saveMode(next);
              }}
            >
              {mode === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              {mode === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
            </button>
          </div>

          <div className="divider" />

          <label className="form-label">Primary Theme Color</label>
          <div className="color-swatches mt-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c.value}
                className={`color-swatch ${appearance.primary_color === c.value ? 'selected' : ''}`}
                style={{ background: c.value }}
                title={c.label}
                onClick={() => saveAppearance({ primary_color: c.value })}
              />
            ))}
            <label className={`color-swatch ${!PRESET_COLORS.some((c) => c.value === appearance.primary_color) ? 'selected' : ''}`} style={{ background: appearance.primary_color, overflow: 'hidden' }} title="Custom color">
              <input
                type="color"
                value={appearance.primary_color}
                onChange={(e) => saveAppearance({ primary_color: e.target.value })}
              />
            </label>
          </div>

          <div className="divider" />

          <label className="form-label">Accent Color</label>
          <div className="color-swatches mt-2">
            {ACCENT_COLORS.map((c) => (
              <button
                key={c}
                className={`color-swatch ${appearance.accent_color === c ? 'selected' : ''}`}
                style={{ background: c }}
                onClick={() => saveAppearance({ accent_color: c })}
              />
            ))}
            <label className={`color-swatch ${!ACCENT_COLORS.includes(appearance.accent_color) ? 'selected' : ''}`} style={{ background: appearance.accent_color, overflow: 'hidden' }} title="Custom accent">
              <input
                type="color"
                value={appearance.accent_color}
                onChange={(e) => saveAppearance({ accent_color: e.target.value })}
              />
            </label>
          </div>

          <div className="divider" />

          <label className="form-label">Border Radius</label>
          <div className="mt-2">
            <Segmented
              options={[
                { value: '8px', label: 'Compact' },
                { value: '12px', label: 'Soft' },
                { value: '16px', label: 'Rounded' },
                { value: '24px', label: 'Extra Soft' },
              ]}
              value={appearance.border_radius}
              onChange={(v) => saveAppearance({ border_radius: v })}
            />
          </div>
        </GlassCard>
      )}

      {tab === 'invoice' && (
        <GlassCard>
          <CardHeader title="Invoice Settings" icon={<ReceiptText size={19} />} />
          <div className="form-grid">
            <FormField label="Invoice Prefix" hint="YYYY becomes the current year — INV-YYYY- → INV-2026-00001">
              <Input value={invoiceForm.invoice_prefix} onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_prefix: e.target.value })} />
            </FormField>
            <FormField label="Currency Symbol">
              <Input value={invoiceForm.currency_symbol} onChange={(e) => setInvoiceForm({ ...invoiceForm, currency_symbol: e.target.value })} />
            </FormField>
            <FormField label="Currency Code">
              <Input value={invoiceForm.currency_code} onChange={(e) => setInvoiceForm({ ...invoiceForm, currency_code: e.target.value })} />
            </FormField>
            <FormField label="Tax Label" hint="e.g. GST, VAT, Sales Tax">
              <Input value={invoiceForm.tax_label} onChange={(e) => setInvoiceForm({ ...invoiceForm, tax_label: e.target.value })} />
            </FormField>
          </div>

          <div className="switch-row">
            <div>
              <strong>Enable Tax</strong>
              <div className="muted" style={{ fontSize: '0.875rem' }}>
                Adds tax to invoices in the billing screen.
              </div>
            </div>
            <Switch
              checked={invoiceForm.tax_enabled}
              onChange={(v) => setInvoiceForm({ ...invoiceForm, tax_enabled: v })}
              id="tax-enabled"
            />
          </div>

          {invoiceForm.tax_enabled && (
            <FormField label="Tax Rate (%)" className="mt-2" hint="Applied to the discounted total">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={invoiceForm.tax_rate}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, tax_rate: e.target.value })}
                style={{ maxWidth: 200 }}
              />
            </FormField>
          )}

          <div className="divider" />

          <FormField label="Invoice Footer Message">
            <TextArea value={invoiceForm.invoice_footer} onChange={(e) => setInvoiceForm({ ...invoiceForm, invoice_footer: e.target.value })} style={{ minHeight: 64 }} />
          </FormField>
          <FormField label="Return Policy" className="mt-3">
            <TextArea value={invoiceForm.return_policy} onChange={(e) => setInvoiceForm({ ...invoiceForm, return_policy: e.target.value })} style={{ minHeight: 76 }} />
          </FormField>

          <div className="flex justify-between items-center mt-4">
            <span className="faint" style={{ fontSize: '0.82rem' }}>
              Invoice numbering continues automatically from your current counter.
            </span>
            <Button onClick={saveInvoice} loading={savingInvoice}>
              <Save size={16} /> Save Invoice Settings
            </Button>
          </div>
        </GlassCard>
      )}

      {tab === 'profile' && (
        <div className="charts-grid">
          <GlassCard>
            <CardHeader title="Admin Profile" icon={<UserCog size={19} />} />
            <div className="form-grid">
              <FormField label="Full Name" required className="form-group--full">
                <Input value={profileForm.full_name} onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} />
              </FormField>
              <FormField label="Email" className="form-group--full" hint="Sign-in email (contact support to change)">
                <Input value={user?.email || ''} disabled />
              </FormField>
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={saveProfileInfo} loading={savingProfile}>
                <Save size={16} /> Save Profile
              </Button>
            </div>
          </GlassCard>

          <GlassCard>
            <CardHeader title="Change Password" icon={<Lock size={19} />} />
            <div className="form-grid">
              <FormField label="New Password" required hint="Minimum 8 characters" className="form-group--full">
                <Input
                  type="password"
                  value={passwordForm.password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                  autoComplete="new-password"
                />
              </FormField>
              <FormField label="Confirm Password" required className="form-group--full">
                <Input
                  type="password"
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                  autoComplete="new-password"
                />
              </FormField>
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={savePassword} loading={savingPassword}>
                <Lock size={16} /> Update Password
              </Button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
