-- ============================================================
-- SHOP MANAGER — Analytics RPCs
-- Efficient aggregation functions for dashboard & analytics.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- Dashboard statistics (single call)
-- ────────────────────────────────────────────────────────────
create or replace function public.get_dashboard_stats()
returns jsonb
language sql
stable
security definer set search_path = public
as $$
  with me as (select auth.uid() as uid),
  inv as (
    select * from public.invoices, me where invoices.user_id = me.uid
  ),
  today_inv as (
    select * from inv where created_at >= date_trunc('day', now())
  ),
  prod as (
    select * from public.products, me where products.user_id = me.uid
  ),
  cust as (
    select * from public.customers, me where customers.user_id = me.uid
  ),
  var as (
    select * from public.product_variants, me where product_variants.user_id = me.uid
  )
  select jsonb_build_object(
    'today_sales',       (select count(*) from today_inv where status = 'completed'),
    'today_orders',      (select count(*) from today_inv),
    'today_revenue',     (select coalesce(sum(total_amount), 0) from today_inv where status = 'completed'),
    'today_units',       (select coalesce(sum(ii.quantity), 0)
                            from public.invoice_items ii
                            join inv on inv.id = ii.invoice_id
                           where inv.status = 'completed'
                             and inv.created_at >= date_trunc('day', now())),
    'total_revenue',     (select coalesce(sum(total_amount), 0) from inv where status = 'completed'),
    'total_customers',   (select count(*) from cust),
    'total_products',    (select count(*) from prod where status = 'active'),
    'low_stock',         (select count(*) from prod
                           where status = 'active' and stock_quantity > 0 and stock_quantity <= min_stock_level),
    'out_of_stock',      (select count(*) from prod where status = 'active' and stock_quantity = 0),
    'low_stock_variants',(select count(*) from var where stock_quantity = 0),
    'pending_payments',  (select coalesce(sum(total_amount), 0) from inv where payment_status = 'pending'),
    'pending_count',     (select count(*) from inv where payment_status = 'pending'),
    'completed_orders',  (select count(*) from inv where status = 'completed'),
    'cancelled_orders',  (select count(*) from inv where status = 'cancelled'),
    'returned_orders',   (select count(*) from inv where status = 'returned'),
    'total_orders',      (select count(*) from inv),
    'stock_value',       (select coalesce(sum(stock_quantity * purchase_price), 0) from prod)
  )
$$;

-- ────────────────────────────────────────────────────────────
-- Revenue / orders time series
-- p_period: 'today' | '7d' | '30d' | '90d' | 'year'
-- ────────────────────────────────────────────────────────────
create or replace function public.get_revenue_series(p_period text default '7d')
returns table (bucket text, revenue numeric, orders bigint)
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_from timestamptz;
  v_trunc text;
begin
  case p_period
    when 'today' then
      v_from := date_trunc('day', now());
      v_trunc := 'hour';
    when '7d' then
      v_from := date_trunc('day', now()) - interval '6 days';
      v_trunc := 'day';
    when '30d' then
      v_from := date_trunc('day', now()) - interval '29 days';
      v_trunc := 'day';
    when '90d' then
      v_from := date_trunc('day', now()) - interval '89 days';
      v_trunc := 'week';
    when 'year' then
      v_from := date_trunc('year', now());
      v_trunc := 'month';
    else
      v_from := date_trunc('day', now()) - interval '6 days';
      v_trunc := 'day';
  end case;

  return query
  select
    to_char(date_trunc(v_trunc, i.created_at),
      case when v_trunc = 'hour' then 'HH12:MI AM'
           when v_trunc = 'month' then 'Mon YYYY'
           when v_trunc = 'week' then 'DD Mon'
           else 'DD Mon' end) as bucket,
    coalesce(sum(i.total_amount), 0)::numeric as revenue,
    count(i.id)::bigint as orders
  from public.invoices i
  where i.user_id = v_user
    and i.status = 'completed'
    and i.created_at >= v_from
  group by 1
  order by min(i.created_at);
end;
$$;

-- ────────────────────────────────────────────────────────────
-- Top selling products (completed invoices only)
-- ────────────────────────────────────────────────────────────
create or replace function public.get_top_products(p_limit integer default 5)
returns table (product_id uuid, product_name text, units bigint, revenue numeric)
language sql
stable
security definer set search_path = public
as $$
  select
    ii.product_id,
    ii.product_name,
    sum(ii.quantity)::bigint as units,
    sum(ii.total_amount)::numeric as revenue
  from public.invoice_items ii
  join public.invoices i on i.id = ii.invoice_id
  where ii.user_id = auth.uid()
    and i.status = 'completed'
  group by ii.product_id, ii.product_name
  order by units desc, revenue desc
  limit greatest(p_limit, 1);
$$;

-- ────────────────────────────────────────────────────────────
-- Payment method breakdown (completed invoices)
-- ────────────────────────────────────────────────────────────
create or replace function public.get_payment_breakdown()
returns table (method text, total numeric, count bigint)
language sql
stable
security definer set search_path = public
as $$
  select
    i.payment_method,
    coalesce(sum(i.total_amount), 0)::numeric as total,
    count(*)::bigint
  from public.invoices i
  where i.user_id = auth.uid()
    and i.status = 'completed'
  group by i.payment_method
  order by total desc;
$$;

-- ────────────────────────────────────────────────────────────
-- Monthly sales for "this year" comparison bars
-- ────────────────────────────────────────────────────────────
create or replace function public.get_monthly_sales()
returns table (month text, revenue numeric, orders bigint)
language sql
stable
security definer set search_path = public
as $$
  select
    to_char(date_trunc('month', i.created_at), 'Mon') as month,
    coalesce(sum(i.total_amount), 0)::numeric as revenue,
    count(*)::bigint as orders
  from public.invoices i
  where i.user_id = auth.uid()
    and i.status = 'completed'
    and i.created_at >= date_trunc('year', now())
  group by 1
  order by min(i.created_at);
$$;
