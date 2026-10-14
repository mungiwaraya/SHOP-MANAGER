import { supabase } from '../lib/supabase';

/** Dashboard + analytics aggregations (RPCs — see migration 0002) */

export async function getDashboardStats() {
  const { data, error } = await supabase.rpc('get_dashboard_stats');
  if (error) throw error;
  return data;
}

export async function getRevenueSeries(period = '7d') {
  const { data, error } = await supabase.rpc('get_revenue_series', { p_period: period });
  if (error) throw error;
  return data || [];
}

export async function getTopProducts(limit = 5) {
  const { data, error } = await supabase.rpc('get_top_products', { p_limit: limit });
  if (error) throw error;
  return data || [];
}

export async function getPaymentBreakdown() {
  const { data, error } = await supabase.rpc('get_payment_breakdown');
  if (error) throw error;
  return data || [];
}

export async function getMonthlySales() {
  const { data, error } = await supabase.rpc('get_monthly_sales');
  if (error) throw error;
  return data || [];
}

/** Recent activity feed */
export async function getRecentActivity(limit = 8) {
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function logActivity(actionType, entityType, description, entityId = '') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from('activity_log').insert({
    user_id: user.id,
    action_type: actionType,
    entity_type: entityType,
    entity_id: entityId ? String(entityId) : '',
    description,
  });
}

/** Global search across products, customers and invoices */
export async function globalSearch(term, limit = 5) {
  const q = term.trim().replace(/[%_,()]/g, ' ').trim();
  if (!q) return { products: [], customers: [], invoices: [] };

  const [products, customers, invoices] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, sku, selling_price, stock_quantity, image_url')
      .or(`name.ilike.%${q}%,sku.ilike.%${q}%`)
      .limit(limit),
    supabase
      .from('customers')
      .select('id, name, mobile, total_orders')
      .or(`name.ilike.%${q}%,mobile.ilike.%${q}%`)
      .limit(limit),
    supabase
      .from('invoices')
      .select('id, invoice_number, customer_name, total_amount, status, created_at')
      .or(`invoice_number.ilike.%${q}%,customer_name.ilike.%${q}%`)
      .limit(limit),
  ]);

  return {
    products: products.data || [],
    customers: customers.data || [],
    invoices: invoices.data || [],
  };
}
