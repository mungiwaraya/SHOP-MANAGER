import { supabase } from '../lib/supabase';

/** Inventory movement history */
export async function listInventoryTransactions({ search = '', productId = '', page = 1, perPage = 12 } = {}) {
  let query = supabase
    .from('inventory_transactions')
    .select('*, product:products(id, name, sku)', { count: 'exact' });

  if (productId) query = query.eq('product_id', productId);
  if (search.trim()) {
    const q = search.trim().replace(/[%_,()]/g, ' ').trim();
    query = query.or(`notes.ilike.%${q}%,reason.ilike.%${q}%,product.name.ilike.%${q}%`);
  }

  const from = (page - 1) * perPage;
  query = query.order('created_at', { ascending: false }).range(from, from + perPage - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { transactions: data || [], count: count || 0 };
}

/** Manual stock adjustment (writes history via RPC) */
export async function adjustStock({ productId, variantId = null, newQty, reason = 'adjustment', notes = '' }) {
  const { error } = await supabase.rpc('adjust_stock', {
    p_product_id: productId,
    p_variant_id: variantId,
    p_new_qty: newQty,
    p_reason: reason,
    p_notes: notes,
  });
  if (error) throw error;
}

/** Low-stock products (active only) */
export async function getLowStockProducts(limit = 20) {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, sku, stock_quantity, min_stock_level, image_url, has_variants, status')
    .eq('status', 'active')
    .order('stock_quantity')
    .limit(limit);
  if (error) throw error;
  return (data || []).filter((p) => p.stock_quantity <= p.min_stock_level);
}

/** Recently added products */
export async function getRecentProducts(limit = 6) {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, sku, stock_quantity, selling_price, image_url, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}
