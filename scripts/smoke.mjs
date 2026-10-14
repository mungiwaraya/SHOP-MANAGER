/**
 * Quick smoke test for the demo data layer (run: node scripts/smoke.mjs).
 * Stubs browser globals, then exercises the query builder + RPCs.
 */

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
globalThis.URL = { createObjectURL: () => 'blob:demo' };

const { demoClient } = await import('../src/lib/demoClient.js');
const assert = (cond, msg) => {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('ok:', msg);
  }
};

// products list with embeds + count
let res = await demoClient.from('products').select('*, category:categories(id, name), variants:product_variants(id, size, color, stock_quantity, price_override)', { count: 'exact' }).order('created_at', { ascending: false }).range(0, 11);
assert(res.data.length === 12 && res.count === 15, `products page: 12 rows, count 15 (got ${res.data.length}/${res.count})`);
assert(res.data[0].category && typeof res.data[0].category === 'object', 'category embed works');
assert(Array.isArray(res.data[0].variants), 'variants embed works');

// search via or + ilike
res = await demoClient.from('products').select('*').or('name.ilike.%t-shirt%,sku.ilike.%t-shirt%').limit(24);
assert(res.data.length > 0, `product search finds ${res.data.length} rows`);

// virtual low-stock flag
res = await demoClient.from('products').select('*').eq('is_low_stock', true).eq('status', 'active');
assert(res.data.every((p) => p.stock_quantity > 0 && p.stock_quantity <= p.min_stock_level), `low stock filter (${res.data.length} rows)`);

// nested search on inventory transactions
res = await demoClient.from('inventory_transactions').select('*, product:products(id, name, sku)', { count: 'exact' }).or('product.name.ilike.%jeans%,notes.ilike.%jeans%');
assert(Array.isArray(res.data), `inventory nested search runs (${res.data.length} rows)`);

// dashboard stats rpc
const stats = (await demoClient.rpc('get_dashboard_stats')).data;
assert(stats.total_orders > 20 && stats.total_customers === 8, `dashboard stats: orders=${stats.total_orders}, customers=${stats.total_customers}`);
assert(typeof stats.today_revenue === 'number', 'today revenue numeric');

// revenue series
for (const period of ['today', '7d', '30d', '90d', 'year']) {
  const series = (await demoClient.rpc('get_revenue_series', { p_period: period })).data;
  assert(Array.isArray(series), `revenue series '${period}' → ${series.length} buckets`);
}

// top products + payment breakdown
assert((await demoClient.rpc('get_top_products', { p_limit: 5 })).data.length > 0, 'top products');
assert((await demoClient.rpc('get_payment_breakdown')).data.length > 0, 'payment breakdown');

// invoice creation flow
const before = (await demoClient.rpc('get_dashboard_stats')).data;
const product = (await demoClient.from('products').select('*').eq('sku', 'BLT-002').single()).data;
const customer = (await demoClient.from('customers').select('*').order('name').limit(1)).data[0];
const inv = (await demoClient.rpc('create_invoice', {
  p_customer_id: customer.id,
  p_customer_name: customer.name,
  p_customer_mobile: customer.mobile,
  p_customer_email: customer.email,
  p_customer_address: customer.address,
  p_subtotal: 449,
  p_discount_amount: 0,
  p_tax_amount: 22.45,
  p_total_amount: 471.45,
  p_payment_method: 'upi',
  p_payment_status: 'paid',
  p_notes: 'smoke test',
  p_items: [{ product_id: product.id, variant_id: null, product_name: product.name, sku: product.sku, size: '', color: '', quantity: 1, unit_price: 449, discount_amount: 0, total_amount: 449 }],
})).data;
assert(inv && inv.invoice_number.startsWith('INV-' + new Date().getFullYear()), `invoice number format: ${inv.invoice_number}`);
const afterSale = (await demoClient.from('products').select('stock_quantity').eq('id', product.id).single()).data.stock_quantity;
assert(afterSale === product.stock_quantity - 1, `stock decremented on sale (${product.stock_quantity} → ${afterSale})`);
const after = (await demoClient.rpc('get_dashboard_stats')).data;
assert(after.today_revenue > before.today_revenue, 'today revenue increased');

// status update → returned restocks
await demoClient.rpc('update_invoice_status', { p_invoice_id: inv.id, p_status: 'returned', p_reason: 'test' });
const restocked = (await demoClient.from('products').select('stock_quantity').eq('id', product.id).single()).data.stock_quantity;
assert(restocked === product.stock_quantity, `restock on return restores original stock (${restocked})`);

// stock adjustment
await demoClient.rpc('adjust_stock', { p_product_id: product.id, p_variant_id: null, p_new_qty: 25, p_reason: 'adjustment', p_notes: 'smoke' });
assert((await demoClient.from('products').select('stock_quantity').eq('id', product.id).single()).data.stock_quantity === 25, 'adjust stock');

// auth flow
await demoClient.auth.signInWithPassword({ email: 'x@y.z', password: 'p' });
const user = (await demoClient.auth.getUser()).data.user;
assert(user?.id === 'demo-admin-0001', 'demo auth user');

console.log('\nSmoke test complete.');
