-- ============================================================
-- SHOP MANAGER — Initial Schema Migration
-- Supabase (PostgreSQL) — run this in the SQL Editor
-- or via `supabase db push`.
--
-- Implements:
--   • Core tables (profiles, shop_settings, products, variants,
--     customers, invoices, invoice_items, payments,
--     inventory_transactions, activity_log)
--   • UUID primary keys, created_at / updated_at
--   • Foreign keys + indexes on commonly searched fields
--   • Row Level Security (every row is scoped to its owner)
--   • Auto profile + settings creation on signup
--   • Atomic invoice creation & invoice status updates (restock)
--   • Storage bucket for shop logo + product images
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 0. Extensions & helpers
-- ────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- Generic updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ────────────────────────────────────────────────────────────
-- 1. PROFILES (mirrors auth.users)
-- ────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  role        text not null default 'admin' check (role in ('admin', 'manager', 'staff')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 2. SHOP SETTINGS (one row per owner — branding, invoice, theme)
-- ────────────────────────────────────────────────────────────
create table if not exists public.shop_settings (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null unique references auth.users(id) on delete cascade,

  -- Shop profile
  shop_name           text not null default 'My Shop',
  tagline             text default '',
  address             text default '',
  phone               text default '',
  email               text default '',
  website             text default '',
  gstin               text default '',
  logo_url            text default '',

  -- Invoice settings
  invoice_prefix      text not null default 'INV-YYYY-',
  invoice_next_number bigint not null default 1,
  invoice_footer      text default 'Thank you for shopping with us!',
  return_policy       text default 'Returns accepted within 7 days with original invoice and tags intact.',
  currency_symbol     text not null default '₹',
  currency_code       text not null default 'INR',
  tax_enabled         boolean not null default false,
  tax_rate            numeric(6, 2) not null default 0,
  tax_label           text not null default 'GST',

  -- Appearance
  theme_mode          text not null default 'light' check (theme_mode in ('light', 'dark')),
  primary_color       text not null default '#111114',
  accent_color        text not null default '#5b7cfa',
  border_radius       text not null default '16px' check (border_radius in ('8px', '12px', '16px', '24px')),

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 3. CATEGORIES (generic product categories)
-- ────────────────────────────────────────────────────────────
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, name)
);

-- ────────────────────────────────────────────────────────────
-- 4. PRODUCTS (generic — clothing is handled via variants)
-- ────────────────────────────────────────────────────────────
create table if not exists public.products (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  name              text not null,
  sku               text not null,
  category_id       uuid references public.categories(id) on delete set null,
  subcategory       text default '',
  brand             text default '',
  description       text default '',
  image_url         text default '',

  purchase_price    numeric(12, 2) not null default 0 check (purchase_price >= 0),
  selling_price     numeric(12, 2) not null default 0 check (selling_price >= 0),
  discount_percent  numeric(5, 2)  not null default 0
                    check (discount_percent >= 0 and discount_percent <= 100),

  stock_quantity    integer not null default 0 check (stock_quantity >= 0),
  min_stock_level   integer not null default 5 check (min_stock_level >= 0),

  status            text not null default 'active' check (status in ('active', 'inactive')),
  has_variants      boolean not null default false,

  -- Generated flag: low-stock items (in stock but at/below minimum)
  is_low_stock      boolean generated always as
                    (stock_quantity > 0 and stock_quantity <= min_stock_level) stored,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, sku)
);

-- ────────────────────────────────────────────────────────────
-- 5. PRODUCT VARIANTS (size / color / any attribute combo)
-- ────────────────────────────────────────────────────────────
create table if not exists public.product_variants (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  product_id      uuid not null references public.products(id) on delete cascade,
  size            text default '',
  color           text default '',
  sku_suffix      text default '',
  stock_quantity  integer not null default 0 check (stock_quantity >= 0),
  price_override  numeric(12, 2) check (price_override is null or price_override >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (product_id, size, color)
);

-- ────────────────────────────────────────────────────────────
-- 6. CUSTOMERS
-- ────────────────────────────────────────────────────────────
create table if not exists public.customers (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  name               text not null,
  mobile             text not null,
  email              text default '',
  address            text default '',
  total_purchases    numeric(12, 2) not null default 0,
  total_orders       integer not null default 0,
  last_purchase_at   timestamptz,
  notes              text default '',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (user_id, mobile),
  check (mobile ~ '^[0-9]{10}$')
);

-- ────────────────────────────────────────────────────────────
-- 7. INVOICES
-- ────────────────────────────────────────────────────────────
create table if not exists public.invoices (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  invoice_number    text not null,
  customer_id       uuid references public.customers(id) on delete set null,

  -- Customer snapshot (kept even if the customer row is removed)
  customer_name     text not null default 'Walk-in Customer',
  customer_mobile   text default '',
  customer_email    text default '',
  customer_address  text default '',

  subtotal          numeric(12, 2) not null default 0,
  discount_amount   numeric(12, 2) not null default 0,
  tax_amount        numeric(12, 2) not null default 0,
  total_amount      numeric(12, 2) not null default 0,

  payment_method    text not null default 'cash'
                    check (payment_method in ('cash', 'upi', 'card', 'bank_transfer', 'other')),
  payment_status    text not null default 'paid'
                    check (payment_status in ('paid', 'pending', 'partial')),
  status            text not null default 'completed'
                    check (status in ('completed', 'pending', 'cancelled', 'returned')),
  notes             text default '',

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, invoice_number)
);

-- ────────────────────────────────────────────────────────────
-- 8. INVOICE ITEMS (snapshot of what was sold)
-- ────────────────────────────────────────────────────────────
create table if not exists public.invoice_items (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  invoice_id        uuid not null references public.invoices(id) on delete cascade,
  product_id        uuid references public.products(id) on delete set null,
  variant_id        uuid references public.product_variants(id) on delete set null,

  -- Snapshot fields
  product_name      text not null,
  sku               text default '',
  size              text default '',
  color             text default '',

  quantity          integer not null check (quantity > 0),
  unit_price        numeric(12, 2) not null check (unit_price >= 0),
  discount_amount   numeric(12, 2) not null default 0 check (discount_amount >= 0),
  total_amount      numeric(12, 2) not null default 0,

  created_at        timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 9. PAYMENTS (payment events per invoice)
-- ────────────────────────────────────────────────────────────
create table if not exists public.payments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  invoice_id    uuid not null references public.invoices(id) on delete cascade,
  amount        numeric(12, 2) not null check (amount >= 0),
  method        text not null default 'cash'
                check (method in ('cash', 'upi', 'card', 'bank_transfer', 'other')),
  reference     text default '',
  notes         text default '',
  paid_at       timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 10. INVENTORY TRANSACTIONS (stock movement history)
-- ────────────────────────────────────────────────────────────
create table if not exists public.inventory_transactions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  product_id      uuid not null references public.products(id) on delete cascade,
  variant_id      uuid references public.product_variants(id) on delete set null,
  change          integer not null,
  previous_qty    integer not null,
  new_qty         integer not null,
  reason          text not null default 'adjustment'
                  check (reason in ('sale', 'purchase', 'adjustment', 'return', 'cancellation', 'damage', 'other')),
  notes           text default '',
  invoice_id      uuid references public.invoices(id) on delete set null,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 11. ACTIVITY LOG (dashboard recent activity)
-- ────────────────────────────────────────────────────────────
create table if not exists public.activity_log (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  action_type   text not null,
  entity_type   text not null,
  entity_id     text default '',
  description   text not null,
  created_at    timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- 12. INDEXES (commonly searched / filtered fields)
-- ────────────────────────────────────────────────────────────
create index if not exists idx_products_user        on public.products (user_id);
create index if not exists idx_products_name        on public.products (user_id, lower(name));
create index if not exists idx_products_sku         on public.products (user_id, lower(sku));
create index if not exists idx_products_category    on public.products (category_id);
create index if not exists idx_products_status      on public.products (user_id, status);
create index if not exists idx_products_low_stock   on public.products (user_id, stock_quantity);

create index if not exists idx_variants_product     on public.product_variants (product_id);
create index if not exists idx_variants_user        on public.product_variants (user_id);

create index if not exists idx_customers_user       on public.customers (user_id);
create index if not exists idx_customers_name       on public.customers (user_id, lower(name));
create index if not exists idx_customers_mobile     on public.customers (user_id, mobile);

create index if not exists idx_invoices_user        on public.invoices (user_id);
create index if not exists idx_invoices_customer    on public.invoices (customer_id);
create index if not exists idx_invoices_created     on public.invoices (user_id, created_at desc);
create index if not exists idx_invoices_status      on public.invoices (user_id, status);
create index if not exists idx_invoices_number      on public.invoices (user_id, invoice_number);
create index if not exists idx_invoices_method      on public.invoices (user_id, payment_method);

create index if not exists idx_invoice_items_inv    on public.invoice_items (invoice_id);
create index if not exists idx_payments_invoice     on public.payments (invoice_id);
create index if not exists idx_inv_tx_product       on public.inventory_transactions (product_id);
create index if not exists idx_inv_tx_created       on public.inventory_transactions (user_id, created_at desc);
create index if not exists idx_activity_user        on public.activity_log (user_id, created_at desc);

-- ────────────────────────────────────────────────────────────
-- 13. updated_at TRIGGERS
-- ────────────────────────────────────────────────────────────
drop trigger if exists set_profiles_updated_at        on public.profiles;
drop trigger if exists set_shop_settings_updated_at   on public.shop_settings;
drop trigger if exists set_categories_updated_at      on public.categories;
drop trigger if exists set_products_updated_at        on public.products;
drop trigger if exists set_variants_updated_at        on public.product_variants;
drop trigger if exists set_customers_updated_at       on public.customers;
drop trigger if exists set_invoices_updated_at        on public.invoices;

create trigger set_profiles_updated_at      before update on public.profiles      for each row execute function public.set_updated_at();
create trigger set_shop_settings_updated_at before update on public.shop_settings for each row execute function public.set_updated_at();
create trigger set_categories_updated_at    before update on public.categories    for each row execute function public.set_updated_at();
create trigger set_products_updated_at      before update on public.products      for each row execute function public.set_updated_at();
create trigger set_variants_updated_at      before update on public.product_variants for each row execute function public.set_updated_at();
create trigger set_customers_updated_at     before update on public.customers     for each row execute function public.set_updated_at();
create trigger set_invoices_updated_at      before update on public.invoices      for each row execute function public.set_updated_at();

-- ────────────────────────────────────────────────────────────
-- 14. AUTO-CREATE PROFILE + DEFAULT SETTINGS ON SIGNUP
-- ────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));

  insert into public.shop_settings (user_id, shop_name, email)
  values (new.id, 'My Shop', coalesce(new.email, ''));

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ────────────────────────────────────────────────────────────
-- 15. ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────
alter table public.profiles                 enable row level security;
alter table public.shop_settings            enable row level security;
alter table public.categories               enable row level security;
alter table public.products                 enable row level security;
alter table public.product_variants         enable row level security;
alter table public.customers                enable row level security;
alter table public.invoices                 enable row level security;
alter table public.invoice_items            enable row level security;
alter table public.payments                 enable row level security;
alter table public.inventory_transactions   enable row level security;
alter table public.activity_log             enable row level security;

-- PROFILES
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Helper: does the current user own this row?
create or replace function public.is_owner(row_user_id uuid)
returns boolean
language sql
stable
as $$
  select auth.uid() = row_user_id
$$;

-- SHOP SETTINGS
drop policy if exists "settings_all_own" on public.shop_settings;
create policy "settings_all_own" on public.shop_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- CATEGORIES
drop policy if exists "categories_all_own" on public.categories;
create policy "categories_all_own" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- PRODUCTS
drop policy if exists "products_all_own" on public.products;
create policy "products_all_own" on public.products
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- PRODUCT VARIANTS
drop policy if exists "variants_all_own" on public.product_variants;
create policy "variants_all_own" on public.product_variants
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- CUSTOMERS
drop policy if exists "customers_all_own" on public.customers;
create policy "customers_all_own" on public.customers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- INVOICES
drop policy if exists "invoices_all_own" on public.invoices;
create policy "invoices_all_own" on public.invoices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- INVOICE ITEMS
drop policy if exists "invoice_items_all_own" on public.invoice_items;
create policy "invoice_items_all_own" on public.invoice_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- PAYMENTS
drop policy if exists "payments_all_own" on public.payments;
create policy "payments_all_own" on public.payments
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- INVENTORY TRANSACTIONS
drop policy if exists "inv_tx_all_own" on public.inventory_transactions;
create policy "inv_tx_all_own" on public.inventory_transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ACTIVITY LOG
drop policy if exists "activity_all_own" on public.activity_log;
create policy "activity_all_own" on public.activity_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 16. RPC — generate the next invoice number atomically
-- ────────────────────────────────────────────────────────────
create or replace function public.next_invoice_number()
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_prefix text;
  v_number bigint;
  v_width  int := 5;
begin
  update public.shop_settings
     set invoice_next_number = invoice_next_number + 1
   where user_id = auth.uid()
  returning invoice_prefix, invoice_next_number - 1
       into v_prefix, v_number;

  if v_number is null then
    -- First use: create settings row if missing
    insert into public.shop_settings (user_id, invoice_next_number)
    values (auth.uid(), 2)
    returning invoice_prefix, invoice_next_number - 1
         into v_prefix, v_number;
  end if;

  -- The token YYYY in the prefix is replaced with the current year,
  -- e.g. 'INV-YYYY-' → 'INV-2026-' producing INV-2026-00001
  return replace(coalesce(v_prefix, 'INV-YYYY-'), 'YYYY', to_char(now(), 'YYYY'))
         || to_char(v_number, 'FM00000');
end;
$$;

-- ────────────────────────────────────────────────────────────
-- 17. RPC — create an invoice with its items atomically
--     (also decrements stock and writes inventory + activity)
-- ────────────────────────────────────────────────────────────
create or replace function public.create_invoice(
  p_customer_id      uuid,
  p_customer_name    text,
  p_customer_mobile  text,
  p_customer_email   text,
  p_customer_address text,
  p_subtotal         numeric,
  p_discount_amount  numeric,
  p_tax_amount       numeric,
  p_total_amount     numeric,
  p_payment_method   text,
  p_payment_status   text,
  p_notes            text,
  p_items            jsonb
) returns public.invoices
language plpgsql
security definer set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_number text;
  v_inv    public.invoices;
  v_item   jsonb;
  v_variant_id uuid;
  v_prev   integer;
  v_new    integer;
  v_qty    integer;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  v_number := public.next_invoice_number();

  insert into public.invoices (
    user_id, invoice_number, customer_id,
    customer_name, customer_mobile, customer_email, customer_address,
    subtotal, discount_amount, tax_amount, total_amount,
    payment_method, payment_status, status, notes
  ) values (
    v_user, v_number, p_customer_id,
    coalesce(p_customer_name, 'Walk-in Customer'), p_customer_mobile, p_customer_email, p_customer_address,
    p_subtotal, p_discount_amount, p_tax_amount, p_total_amount,
    p_payment_method, coalesce(p_payment_status, 'paid'), 'completed', p_notes
  )
  returning * into v_inv;

  for v_item in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    v_qty := coalesce((v_item->>'quantity')::integer, 1);
    v_variant_id := nullif(v_item->>'variant_id', '')::uuid;

    insert into public.invoice_items (
      user_id, invoice_id, product_id, variant_id,
      product_name, sku, size, color,
      quantity, unit_price, discount_amount, total_amount
    ) values (
      v_user, v_inv.id, nullif(v_item->>'product_id', '')::uuid, v_variant_id,
      v_item->>'product_name', coalesce(v_item->>'sku', ''),
      coalesce(v_item->>'size', ''), coalesce(v_item->>'color', ''),
      v_qty,
      coalesce((v_item->>'unit_price')::numeric, 0),
      coalesce((v_item->>'discount_amount')::numeric, 0),
      coalesce((v_item->>'total_amount')::numeric, 0)
    );

    -- Stock decrement (variant first, then product)
    if v_variant_id is not null then
      select stock_quantity into v_prev from public.product_variants where id = v_variant_id and user_id = v_user for update;
      if v_prev is not null then
        v_new := greatest(v_prev - v_qty, 0);
        update public.product_variants set stock_quantity = v_new where id = v_variant_id;
      end if;
    end if;

    if (v_item->>'product_id') is not null then
      select stock_quantity into v_prev from public.products where id = (v_item->>'product_id')::uuid and user_id = v_user for update;
      if v_prev is not null then
        v_new := greatest(v_prev - v_qty, 0);
        update public.products set stock_quantity = v_new where id = (v_item->>'product_id')::uuid;
        -- One history row per line item (variant noted on the row)
        insert into public.inventory_transactions
          (user_id, product_id, variant_id, change, previous_qty, new_qty, reason, invoice_id, created_by, notes)
        values
          (v_user, (v_item->>'product_id')::uuid, v_variant_id, -v_qty, v_prev, v_new, 'sale', v_inv.id, v_user, 'Sale — ' || v_number);
      end if;
    end if;
  end loop;

  -- Payment record
  insert into public.payments (user_id, invoice_id, amount, method)
  values (v_user, v_inv.id, p_total_amount, p_payment_method);

  -- Update customer aggregates
  if p_customer_id is not null then
    update public.customers
       set total_purchases  = total_purchases + p_total_amount,
           total_orders     = total_orders + 1,
           last_purchase_at = now()
     where id = p_customer_id and user_id = v_user;
  end if;

  insert into public.activity_log (user_id, action_type, entity_type, entity_id, description)
  values (v_user, 'invoice_created', 'invoice', v_inv.id::text,
          'New invoice ' || v_number || ' generated for ' || coalesce(p_customer_name, 'Walk-in Customer'));

  return v_inv;
end;
$$;

-- ────────────────────────────────────────────────────────────
-- 18. RPC — update invoice status with proper restock handling
--     (returns / cancellations restore stock and reverse customer
--      aggregates — the sale is never deleted, only marked)
-- ────────────────────────────────────────────────────────────
create or replace function public.update_invoice_status(
  p_invoice_id uuid,
  p_status     text,
  p_reason     text default ''
) returns public.invoices
language plpgsql
security definer set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_inv    public.invoices;
  v_old    text;
  v_item   record;
  v_prev   integer;
  v_new    integer;
begin
  select * into v_inv from public.invoices
   where id = p_invoice_id and user_id = v_user for update;

  if not found then
    raise exception 'Invoice not found';
  end if;

  v_old := v_inv.status;
  if v_old = p_status then
    return v_inv;
  end if;

  -- Moving INTO returned/cancelled → restock + reverse customer totals
  if p_status in ('returned', 'cancelled') and v_old not in ('returned', 'cancelled') then
    for v_item in
      select * from public.invoice_items where invoice_id = p_invoice_id and user_id = v_user
    loop
      if v_item.variant_id is not null then
        select stock_quantity into v_prev from public.product_variants where id = v_item.variant_id for update;
        if v_prev is not null then
          v_new := v_prev + v_item.quantity;
          update public.product_variants set stock_quantity = v_new where id = v_item.variant_id;
        end if;
      end if;

      if v_item.product_id is not null then
        select stock_quantity into v_prev from public.products where id = v_item.product_id for update;
        if v_prev is not null then
          v_new := v_prev + v_item.quantity;
          update public.products set stock_quantity = v_new where id = v_item.product_id;
        end if;

        insert into public.inventory_transactions
          (user_id, product_id, variant_id, change, previous_qty, new_qty, reason, invoice_id, created_by, notes)
        values
          (v_user, v_item.product_id, v_item.variant_id,
           v_item.quantity, coalesce(v_prev, 0), coalesce(v_new, 0),
           case when p_status = 'returned' then 'return' else 'cancellation' end,
           p_invoice_id, v_user,
           coalesce(p_reason, 'Invoice ' || p_status));
      end if;
    end loop;

    if v_inv.customer_id is not null then
      update public.customers
         set total_purchases = greatest(total_purchases - v_inv.total_amount, 0),
             total_orders    = greatest(total_orders - 1, 0)
       where id = v_inv.customer_id and user_id = v_user;
    end if;
  end if;

  -- Moving BACK from returned/cancelled to completed → restock is re-applied
  if v_old in ('returned', 'cancelled') and p_status = 'completed' then
    for v_item in
      select * from public.invoice_items where invoice_id = p_invoice_id and user_id = v_user
    loop
      if v_item.variant_id is not null then
        select stock_quantity into v_prev from public.product_variants where id = v_item.variant_id for update;
        if v_prev is not null then
          update public.product_variants set stock_quantity = greatest(v_prev - v_item.quantity, 0) where id = v_item.variant_id;
        end if;
      end if;

      if v_item.product_id is not null then
        select stock_quantity into v_prev from public.products where id = v_item.product_id for update;
        if v_prev is not null then
          update public.products set stock_quantity = greatest(v_prev - v_item.quantity, 0) where id = v_item.product_id;
        end if;

        insert into public.inventory_transactions
          (user_id, product_id, variant_id, change, previous_qty, new_qty, reason, invoice_id, created_by, notes)
        values
          (v_user, v_item.product_id, v_item.variant_id,
           -v_item.quantity, coalesce(v_prev, 0), coalesce(greatest(v_prev - v_item.quantity, 0), 0),
           'sale', p_invoice_id, v_user, 'Re-instated sale');
      end if;
    end loop;

    if v_inv.customer_id is not null then
      update public.customers
         set total_purchases = total_purchases + v_inv.total_amount,
             total_orders    = total_orders + 1,
             last_purchase_at = now()
       where id = v_inv.customer_id and user_id = v_user;
    end if;
  end if;

  update public.invoices
     set status = p_status,
         payment_status = case
           when p_status = 'completed' then 'paid'
           when p_status in ('returned', 'cancelled') then 'pending'
           else payment_status
         end
   where id = p_invoice_id
  returning * into v_inv;

  insert into public.activity_log (user_id, action_type, entity_type, entity_id, description)
  values (v_user, 'invoice_' || p_status, 'invoice', p_invoice_id::text,
          'Invoice ' || v_inv.invoice_number || ' marked ' || p_status ||
          case when coalesce(p_reason, '') <> '' then ' — ' || p_reason else '' end);

  return v_inv;
end;
$$;

-- ────────────────────────────────────────────────────────────
-- 19. RPC — adjust stock manually (writes inventory history)
-- ────────────────────────────────────────────────────────────
create or replace function public.adjust_stock(
  p_product_id uuid,
  p_variant_id uuid,
  p_new_qty    integer,
  p_reason     text,
  p_notes      text default ''
) returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_prev integer;
begin
  if p_new_qty < 0 then
    raise exception 'Quantity cannot be negative';
  end if;

  if p_variant_id is not null then
    select stock_quantity into v_prev
      from public.product_variants
     where id = p_variant_id and user_id = v_user for update;
    if v_prev is null then
      raise exception 'Variant not found';
    end if;
    update public.product_variants set stock_quantity = p_new_qty where id = p_variant_id;
    -- keep parent product total in sync when variants are used
    update public.products
       set stock_quantity = (
         select coalesce(sum(stock_quantity), 0)
           from public.product_variants
          where product_id = p_product_id and user_id = v_user
       )
     where id = p_product_id and user_id = v_user and has_variants = true;
  else
    select stock_quantity into v_prev
      from public.products
     where id = p_product_id and user_id = v_user for update;
    if v_prev is null then
      raise exception 'Product not found';
    end if;
    update public.products set stock_quantity = p_new_qty where id = p_product_id;
  end if;

  insert into public.inventory_transactions
    (user_id, product_id, variant_id, change, previous_qty, new_qty, reason, notes, created_by)
  values
    (v_user, p_product_id, p_variant_id, p_new_qty - v_prev, v_prev, p_new_qty,
     coalesce(p_reason, 'adjustment'), p_notes, v_user);
end;
$$;

-- ────────────────────────────────────────────────────────────
-- 20. STORAGE — shop assets (logo / product images)
--     Public read, owner-only write inside their own folder.
-- ────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shop-assets', 'shop-assets', true, 5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do nothing;

drop policy if exists "shop_assets_public_read" on storage.objects;
drop policy if exists "shop_assets_owner_insert" on storage.objects;
drop policy if exists "shop_assets_owner_update" on storage.objects;
drop policy if exists "shop_assets_owner_delete" on storage.objects;

create policy "shop_assets_public_read" on storage.objects
  for select using (bucket_id = 'shop-assets');

create policy "shop_assets_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'shop-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "shop_assets_owner_update" on storage.objects
  for update using (
    bucket_id = 'shop-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "shop_assets_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'shop-assets'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- Done. Next steps:
--   1. Auth → Providers → Email: disable "Confirm email" for a
--      faster private setup (or keep it on for production).
--   2. Create your admin user via the app's sign-up / SQL insert,
--      or via Dashboard → Authentication → Add user.
--   3. Never expose the service_role key to the frontend.
-- ============================================================
