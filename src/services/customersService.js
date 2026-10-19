import { supabase } from '../lib/supabase';

export async function listCustomers({ search = '', page = 1, perPage = 10 } = {}) {
  let query = supabase.from('customers').select('*', { count: 'exact' });

  if (search.trim()) {
    const q = search.trim().replace(/[%_,()]/g, ' ').trim();
    query = query.or(`name.ilike.%${q}%,mobile.ilike.%${q}%,email.ilike.%${q}%`);
  }

  const from = (page - 1) * perPage;
  query = query.order('created_at', { ascending: false }).range(from, from + perPage - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { customers: data || [], count: count || 0 };
}

export async function searchCustomersLite(search = '', limit = 8) {
  let query = supabase
    .from('customers')
    .select('id, name, mobile, email, total_purchases, total_orders')
    .order('name')
    .limit(limit);

  if (search.trim()) {
    const q = search.trim().replace(/[%_,()]/g, ' ').trim();
    query = query.or(`name.ilike.%${q}%,mobile.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getCustomer(id) {
  const { data, error } = await supabase.from('customers').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function createCustomer(payload) {
  let userId = null;
  try {
    const { data } = await supabase.auth.getUser();
    userId = data?.user?.id || null;
  } catch {
    userId = null;
  }

  const insertPayload = { ...payload };
  if (userId) {
    insertPayload.user_id = userId;
  }

  const { data, error } = await supabase
    .from('customers')
    .insert(insertPayload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCustomer(id, payload) {
  const { error } = await supabase.from('customers').update(payload).eq('id', id);
  if (error) throw error;
  return getCustomer(id);
}

export async function deleteCustomer(id) {
  const { error } = await supabase.from('customers').delete().eq('id', id);
  if (error) throw error;
}

/** Purchase history for a customer profile */
export async function getCustomerInvoices(customerId, limit = 50) {
  const { data, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, created_at, total_amount, payment_method, payment_status, status, customer_name')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

/** Products of one invoice (for history detail) */
export async function getInvoiceItems(invoiceId) {
  const { data, error } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('created_at');
  if (error) throw error;
  return data || [];
}
