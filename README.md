# SHOP MANAGER

**Complete Shop Management, Billing, Customer Management & Sales Analytics System** for a modern clothing retail business — architected so it can adapt to any retail shop (electronics, grocery, cosmetics, footwear, accessories, general retail).

Built with **React + Vite**, **Supabase** (PostgreSQL, Auth, Storage, RLS), styled with a premium **Minimalism + Glassmorphism** design system (**Syne** typography, light/dark themes, customizable accent colors), and ready to deploy on **Cloudflare Pages**.

---

## ✨ Features

| Module | What you get |
| --- | --- |
| **Authentication** | Supabase email/password auth — login, logout, forgot/reset password, persistent sessions, protected routes, RLS on every table |
| **Dashboard** | 12 live stat cards (today's sales/orders/revenue, totals, low & out-of-stock, pending payments, completed/cancelled/returned), quick actions, revenue chart, top products, recent transactions, recent activity feed |
| **Sales Analytics** | Revenue trend (Today / 7d / 30d / 3 months / This Year), orders-over-time, payment-method breakdown, monthly comparison, top sellers |
| **Products** | Full CRUD, search, filters (category/status/stock), active/inactive, images, brands, **size/color variants** with per-variant stock & price |
| **Inventory** | Stock value, low-stock alerts, recently added, manual stock adjustments with full history (before/after, reason, notes) |
| **Billing (POS)** | Fast flow: customer (existing/new/walk-in) → product search → cart (qty, line discounts, variant swap) → order discount → tax → payment method → **generate invoice** |
| **Invoices** | Unique numbers (`INV-2026-00001`), clean in-app preview, professional **A4 PDF** (jsPDF, logo support), print, download |
| **WhatsApp** | Prepared invoice message opens the customer's chat (`wa.me` deep-link). On mobile, native share (`navigator.share`) can deliver the actual PDF through WhatsApp — never faked |
| **Customers** | Full CRUD, purchase history per invoice, totals (spent/orders/last purchase), profile page |
| **Bills** | All invoices with search + date/status/payment filters; view, status changes (Completed/Pending/Cancelled/Returned with **automatic restock**), delete/void with confirmation |
| **Global Search** | ⌘K / Ctrl+K across products, customers and invoices |
| **Settings** | Shop profile + logo upload (Supabase Storage), light/dark mode, primary + accent colors, border radius, invoice prefix/numbering, tax config, currency, footer, return policy, admin profile & password |
| **Theme System** | CSS variables everywhere; theme saved to Supabase and follows the admin across devices |
| **UX** | Glass cards, skeleton loaders, empty states, error states, toast notifications, confirmation dialogs, fully responsive (desktop → mobile with bottom navigation) |

---

## 🧱 Tech Stack

- **Frontend:** React 18 + Vite 5, React Router 6 (lazy-loaded routes)
- **Backend / DB / Auth / Storage:** Supabase (PostgreSQL + RLS + RPCs)
- **Charts:** Recharts · **PDF:** jsPDF + jspdf-autotable · **Icons:** Lucide React
- **Styling:** Modern CSS with theme tokens (`--primary-color`, `--glass-background`, …) — Syne font
- **Hosting:** Cloudflare Pages (SPA redirects included)

---

## 📂 Project Structure

```text
shop-manager/
├── index.html
├── vite.config.js
├── .env.example                  ← copy to .env
├── public/
│   └── _redirects                ← Cloudflare SPA fallback
├── supabase/
│   └── migrations/
│       ├── 0001_initial_schema.sql   ← tables, RLS, triggers, RPCs, storage
│       └── 0002_analytics_rpcs.sql   ← dashboard/chart aggregations
├── scripts/
│   └── smoke.mjs                 ← data-layer smoke test
└── src/
    ├── components/
    │   ├── ui/                   ← Button, Input, Modal, DataTable, Badge…
    │   ├── billing/              ← CustomerSelector
    │   ├── products/             ← ProductFormModal (variants)
    │   ├── inventory/            ← StockAdjustModal
    │   └── invoices/             ← InvoicePreview, InvoiceActions (PDF/WhatsApp)
    ├── contexts/                 ← Auth, Theme, Toast, Shop (settings)
    ├── layouts/                  ← DashboardLayout, Sidebar, Topbar, BottomNav, GlobalSearch
    ├── pages/                    ← Login, Dashboard, Billing, Products, Inventory,
    │                                Customers, CustomerProfile, Bills, Analytics, Settings…
    ├── services/                 ← supabase data access layer
    ├── hooks/                    ← useDebounce, useAsyncData, useMediaQuery…
    ├── lib/                      ← supabase client (+ demo mode)
    ├── utils/                    ← formatters, validators, pdf.js, whatsapp.js
    └── styles/                   ← theme.css (tokens), global.css (design system)
```

---

## 🚀 Local Setup

### 1. Install & run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
npm run preview    # preview the production build
```

### 2. Create the Supabase project

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run, **in order**:
   - `supabase/migrations/0001_initial_schema.sql`
   - `supabase/migrations/0002_analytics_rpcs.sql`
3. (Recommended) **Authentication → Providers → Email**: disable *"Confirm email"* for a private single-admin setup — or keep it enabled and confirm via email in production.
4. **Authentication → Users → Add user** — create your admin (email + password).

### 3. Environment variables

```bash
cp .env.example .env
```

Fill in (**Project Settings → API**):

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

> ⚠️ **Never** put the `service_role` key in this project, in client code, or in a git repository. The anon key is safe to expose — **Row Level Security** protects every row. All env usage happens via `import.meta.env` (Vite), never hard-coded.

### 4. Sign in

Open the app → sign in with the admin user you created → set up your shop in **Settings** (name, logo, currency, tax, invoice prefix, theme).

---

## 🗃️ Database Architecture

Postgres schema (UUID PKs, `created_at` / `updated_at` triggers, FKs, indexes on search fields):

| Table | Purpose |
| --- | --- |
| `profiles` | Admin profile (auto-created on signup) |
| `shop_settings` | Shop branding, invoice config, tax, theme (persisted across devices) |
| `categories` | Product categories |
| `products` | Products with pricing, stock, min levels, status, `is_low_stock` generated flag |
| `product_variants` | Size/color (any attribute) variants with own stock & price override |
| `customers` | Customer records + purchase aggregates |
| `invoices` | Invoices with customer snapshot, totals, payment method & status |
| `invoice_items` | Line items (product/price snapshot at time of sale) |
| `payments` | Payment events per invoice |
| `inventory_transactions` | Every stock movement (sale, purchase, adjustment, return…) |
| `activity_log` | Dashboard recent activity feed |

**Atomic RPCs** (business logic lives in Postgres, safe under concurrency):

- `next_invoice_number()` — atomic counter (`INV-YYYY-` prefix → `INV-2026-00001`; `YYYY` becomes the current year)
- `create_invoice(...)` — invoice + items + stock decrement + inventory history + payment + customer aggregates + activity, all in one transaction
- `update_invoice_status(...)` — returns/cancellations **restore stock and reverse customer totals** (sales are never deleted — they're marked Returned/Cancelled and kept in history); restoring to Completed re-applies the sale
- `adjust_stock(...)` — manual adjustments with history
- `get_dashboard_stats()`, `get_revenue_series()`, `get_top_products()`, `get_payment_breakdown()`, `get_monthly_sales()` — analytics aggregations

**Storage:** `shop-assets` bucket (public read, owner-only write) for the shop logo and product images.

**RLS:** every table is scoped `auth.uid() = user_id` — the admin only ever sees their shop's data. The architecture keeps a `role` column on `profiles` for future roles (manager/staff).

---

## 🧪 Demo Mode

If the Supabase env vars are **not** set, the app boots in a clearly-labelled **Demo mode**: a fully interactive UI backed by in-memory sample data (a realistic clothing store — products with size/color variants, 30 invoices across the year, customers, stock history). Every screen, the billing flow, PDF generation and WhatsApp hand-off are fully usable so you can evaluate the product before connecting your project.

- Banner at the top explains the mode and links to the setup guide (`/setup`).
- "Reset demo data" restores the sample store.
- **The moment `.env` contains real credentials, demo mode is disabled and all data flows through Supabase + RLS.** No demo code runs in production.

Run the data-layer smoke test with:

```bash
node scripts/smoke.mjs
```

---

## ☁️ Cloudflare Pages Deployment

### Option A — Git integration (recommended)

1. Push this repository to GitHub/GitLab.
2. [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages → Create → Pages → Connect to Git**.
3. Build settings:
   - **Framework preset:** `Vite`
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. **Settings → Environment variables** (Production & Preview):
   - `VITE_SUPABASE_URL` = your project URL
   - `VITE_SUPABASE_ANON_KEY` = your anon key
5. **Save and Deploy**. Cloudflare rebuilds automatically on every push.

### Option B — Wrangler CLI

```bash
npm run build
npx wrangler pages deploy dist
```

Set the env vars in the dashboard (or `wrangler pages secret put VITE_SUPABASE_URL`).

### SPA routing (no 404 on refresh)

`public/_redirects` is copied into `dist` at build time:

```text
/*    /index.html   200
```

Every React Router route (`/billing`, `/bills`, `/customers/:id`, …) serves the SPA — refreshes and deep links work. HTTPS is automatic on `*.pages.dev` (and on custom domains).

### Custom domain

**Pages → your project → Custom domains → Set up a custom domain** and follow the DNS instructions.

---

## 📱 WhatsApp Bill Sharing — honest flow

Browser `wa.me` deep-links **cannot attach files**. This app never pretends otherwise:

1. **Download / Print / Preview** the real PDF invoice (generated client-side).
2. **WhatsApp** button:
   - On supporting mobile browsers: opens the native share sheet with the actual PDF (`navigator.share` with files) — send it straight into the customer's chat.
   - Everywhere else: opens the customer's WhatsApp chat with the prepared message (name, invoice number, total, shop) — attach the downloaded PDF to send the bill.
3. **Share** uses the Web Share API where available (PDF + message).

---

## ✅ Data Validation

Frontend **and** database-level:

- Mobile: exactly **10 digits** (regex-checked in Postgres too)
- Prices: valid positive numbers · Quantities: non-negative integers
- Customer name required; mobile required for WhatsApp billing
- Product name / selling price / stock validated; discount 0–100
- Duplicate SKUs and duplicate customer mobiles rejected with friendly toasts

---

## 🔒 Security Checklist

- [x] Service-role key **never** shipped to the client — only URL + anon key
- [x] RLS enabled on **every** table with owner-scoped policies
- [x] Storage policies restrict writes to the owner's own folder
- [x] Auth via Supabase (session persistence, auto token refresh, reset-password flow)
- [x] Secrets only through environment variables (`.env` is git-ignored)

---

## 🌍 Generalization

Clothing-specific needs (sizes, colors) live in **`product_variants`** — nothing is hard-coded to apparel. Categories, brands, and arbitrary variant attributes (size/color today; capacity/color/year tomorrow) make the same app work for electronics, grocery, cosmetics, footwear, and general retail. Currency, tax label/rate, and invoice formatting are all configurable in Settings.

---

## 📌 Notes & Limitations

- **PDF language:** the generated PDF uses standard Latin fonts (English). The full UI (including invoices in-app) supports Hindi and other Unicode scripts via the browser; embedding a Devanagari TTF into jsPDF is possible later if Hindi PDF output is required.
- **Invoice editing:** invoices are transactional records — change *status* (with automatic stock handling) rather than editing line items; create a new invoice for corrections and return the old one.

---

Made with care — a premium, production-ready private business system. 🛍️
