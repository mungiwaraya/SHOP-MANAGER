import { supabase } from '../lib/supabase';

const INVOICE_SELECT = '*';

/** List invoices with search + filters + pagination */
export async function listInvoices({
  search = '',
  status = '',
  paymentMethod = '',
  dateFrom = '',
  dateTo = '',
  customerId = '',
  page = 1,
  perPage = 12,
} = {}) {
  let query = supabase.from('invoices').select(INVOICE_SELECT, { count: 'exact' });

  if (search.trim()) {
    const q = search.trim().replace(/[%_,()]/g, ' ').trim();
    query = query.or(`invoice_number.ilike.%${q}%,customer_name.ilike.%${q}%,customer_mobile.ilike.%${q}%`);
  }
  if (status) query = query.eq('status', status);
  if (paymentMethod) query = query.eq('payment_method', paymentMethod);
  if (customerId) query = query.eq('customer_id', customerId);
  if (dateFrom) query = query.gte('created_at', dateFrom);
  if (dateTo) query = query.lte('created_at', dateTo);

  const from = (page - 1) * perPage;
  query = query.order('created_at', { ascending: false }).range(from, from + perPage - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { invoices: data || [], count: count || 0 };
}

export async function getInvoice(id) {
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;

  const { data: items, error: itemsError } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', id)
    .order('created_at');
  if (itemsError) throw itemsError;

  return { ...invoice, items: items || [] };
}

export async function getInvoiceByNumber(invoiceNumber) {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('invoice_number', invoiceNumber)
    .single();
  if (error) throw error;
  const { data: items } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', data.id);
  return { ...data, items: items || [] };
}

/**
 * Create an invoice (atomic RPC):
 * - generates the next invoice number
 * - writes invoice + items
 * - decrements stock + writes inventory history
 * - updates customer aggregates
 * - writes a payment record + activity log
 */
export async function createInvoice(payload) {
  const { data, error } = await supabase.rpc('create_invoice', {
    p_customer_id: payload.customer_id || null,
    p_customer_name: payload.customer_name || 'Walk-in Customer',
    p_customer_mobile: payload.customer_mobile || '',
    p_customer_email: payload.customer_email || '',
    p_customer_address: payload.customer_address || '',
    p_subtotal: payload.subtotal,
    p_discount_amount: payload.discount_amount,
    p_tax_amount: payload.tax_amount,
    p_total_amount: payload.total_amount,
    p_payment_method: payload.payment_method,
    p_payment_status: payload.payment_status || 'paid',
    p_notes: payload.notes || '',
    p_transaction_reference: payload.transaction_reference || '',
    p_final_amount_override: payload.final_amount_override ?? null,
    p_calculated_amount: payload.calculated_amount ?? payload.total_amount,
    p_items: payload.items,
  });
  if (error) throw error;
  return data;
}

/**
 * Update invoice status (Completed / Pending / Cancelled / Returned).
 * Restock + customer aggregates are handled atomically in Postgres.
 */
export async function updateInvoiceStatus(id, status, reason = '') {
  const { data, error } = await supabase.rpc('update_invoice_status', {
    p_invoice_id: id,
    p_status: status,
    p_reason: reason,
  });
  if (error) throw error;
  return data;
}

/**
 * Delete / void an invoice.
 * A completed/pending invoice is first cancelled (stock restored via RPC),
 * then removed. Returned/cancelled invoices are removed directly.
 */
export async function deleteInvoice(invoice) {
  if (invoice.status === 'completed' || invoice.status === 'pending') {
    await updateInvoiceStatus(invoice.id, 'cancelled', 'Invoice deleted');
  }
  const { error } = await supabase.from('invoices').delete().eq('id', invoice.id);
  if (error) throw error;
}

/** Light invoice list for dashboards / widgets */
export async function recentTransactions(limit = 8) {
  const { data, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, customer_name, total_amount, payment_method, status, payment_status, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}
