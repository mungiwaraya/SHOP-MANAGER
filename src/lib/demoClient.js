/**
 * In-memory Supabase-compatible client — DEMO MODE ONLY.
 *
 * Implements the small subset of the supabase-js API used by this app:
 * auth, from().select()/insert()/update()/delete()/upsert() with filters,
 * rpc() for the analytics + invoice functions, and storage for uploads.
 *
 * ⚠️ Never used when real Supabase env vars are configured.
 */
import { demoDb, persistDemoDb, DEMO_USER } from './demoDb.js';

const AUTH_KEY = 'shop-manager-demo-auth';

// ── helpers ─────────────────────────────────────────────────
const iso = () => new Date().toISOString();
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

function splitTopLevel(str) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const ch of str) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function parseSelect(expr) {
  const columns = [];
  const embeds = [];
  if (!expr || expr.trim() === '*') return { columns: ['*'], embeds };
  for (const part of splitTopLevel(expr)) {
    const m = part.match(/^(\w+)\s*:\s*(\w+)\s*\(([^)]*)\)$/);
    if (m) {
      embeds.push({ alias: m[1], table: m[2], cols: m[3].trim() });
    } else if (part) {
      columns.push(part.split(/\s+as\s+/i)[0].trim());
    }
  }
  return { columns: columns.length ? columns : ['*'], embeds };
}

function pickColumns(row, columns) {
  if (columns.includes('*')) return { ...row };
  const out = {};
  for (const col of columns) {
    if (col.includes('.')) continue;
    out[col] = row[col];
  }
  return out;
}

/** Resolve a (possibly virtual / nested) field value from a raw row. */
function cellValue(row, colPath) {
  if (colPath === 'is_low_stock') {
    return row.stock_quantity > 0 && row.stock_quantity <= (row.min_stock_level ?? 0);
  }
  if (colPath.includes('.')) {
    // Embedded relation, e.g. product.name on inventory_transactions
    const [rel, ...rest] = colPath.split('.');
    const fkMap = { product: 'product_id', category: 'category_id', customer: 'customer_id', invoice: 'invoice_id', variant: 'variant_id' };
    const tableMap = { product: 'products', category: 'categories', customer: 'customers', invoice: 'invoices', variant: 'product_variants' };
    const fk = fkMap[rel];
    const table = tableMap[rel];
    const target = fk && table && row[fk] ? (demoDb[table] || []).find((r) => r.id === row[fk]) : null;
    return target ? rest.reduce((acc, k) => acc?.[k], target) : undefined;
  }
  return row[colPath];
}

function matchesOr(row, orExpr) {
  return orExpr.split(',').some((cond) => {
    const OPS = ['ilike', 'like', 'eq', 'neq', 'gte', 'lte', 'gt', 'lt'];
    const parts = cond.split('.');
    const opIdx = parts.findIndex((p) => OPS.includes(p));
    if (opIdx <= 0 || opIdx === parts.length - 1) return false;
    const col = parts.slice(0, opIdx).join('.');
    const op = parts[opIdx];
    const value = parts.slice(opIdx + 1).join('.').replace(/^%|%$/g, '');
    const raw = cellValue(row, col);
    const cell = String(raw ?? '').toLowerCase();
    const target = String(value).toLowerCase();
    if (op === 'ilike' || op === 'like') return cell.includes(target);
    if (op === 'eq') return String(raw ?? '') === value;
    return false;
  });
}

// ── query builder ───────────────────────────────────────────
class DemoQuery {
  constructor(db, table) {
    this.db = db;
    this.table = table;
    this.op = 'select';
    this.columns = '*';
    this.countWanted = false;
    this.filters = [];
    this.orderBy = null;
    this.rangeFrom = null;
    this.rangeTo = null;
    this.limitN = null;
    this.singleRow = false;
    this.optionalSingle = false;
    this.payload = null;
    this.upsertOptions = null;
    this.pendingError = null;
  }

  select(cols = '*', opts = {}) {
    if (this.op === 'select' || this.op === 'insert' || this.op === 'update' || this.op === 'upsert') {
      this.columns = cols;
      this.countWanted = opts.count === 'exact';
    }
    return this;
  }

  insert(rows) {
    this.op = 'insert';
    this.payload = Array.isArray(rows) ? rows : [rows];
    return this;
  }

  update(patch) {
    this.op = 'update';
    this.payload = patch;
    return this;
  }

  upsert(rows, opts = {}) {
    this.op = 'upsert';
    this.payload = Array.isArray(rows) ? rows : [rows];
    this.upsertOptions = opts;
    return this;
  }

  delete() {
    this.op = 'delete';
    return this;
  }

  eq(col, val) {
    this.filters.push((r) => cellValue(r, col) === val);
    return this;
  }

  neq(col, val) {
    this.filters.push((r) => cellValue(r, col) !== val);
    return this;
  }

  gt(col, val) {
    this.filters.push((r) => cellValue(r, col) > val);
    return this;
  }

  gte(col, val) {
    this.filters.push((r) => cellValue(r, col) >= val);
    return this;
  }

  lt(col, val) {
    this.filters.push((r) => cellValue(r, col) < val);
    return this;
  }

  lte(col, val) {
    this.filters.push((r) => cellValue(r, col) <= val);
    return this;
  }

  is(col, val) {
    this.filters.push((r) => (val === null ? r[col] === null || r[col] === undefined : r[col] === val));
    return this;
  }

  or(expr) {
    this.filters.push((r) => matchesOr(r, expr));
    return this;
  }

  order(col, opts = {}) {
    this.orderBy = { col, ascending: opts.ascending !== false };
    return this;
  }

  range(from, to) {
    this.rangeFrom = from;
    this.rangeTo = to;
    return this;
  }

  limit(n) {
    this.limitN = n;
    return this;
  }

  single() {
    this.singleRow = true;
    return this;
  }

  maybeSingle() {
    this.optionalSingle = true;
    return this;
  }

  // ── execution ─────────────────────────────────────────────
  _rows() {
    const table = this.db[this.table] || [];
    return table.filter((r) => this.filters.every((f) => f(r)));
  }

  _sort(rows) {
    if (!this.orderBy) return rows;
    const { col, ascending } = this.orderBy;
    return [...rows].sort((a, b) => {
      const av = a[col];
      const bv = b[col];
      if (av === bv) return 0;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp = av > bv ? 1 : -1;
      return ascending ? cmp : -cmp;
    });
  }

  _applyEmbeds(row) {
    const { columns, embeds } = parseSelect(this.columns);
    const out = pickColumns(row, columns);
    for (const emb of embeds) {
      const localKey = emb.table.replace(/s$/, '_id');
      const candidates = {
        categories: 'category_id',
        products: 'product_id',
        product_variants: 'variant_id',
        customers: 'customer_id',
        invoices: 'invoice_id',
      };
      const fk = candidates[emb.table];
      if (fk && row[fk]) {
        const rel = (this.db[emb.table] || []).find((r) => r.id === row[fk]);
        out[emb.alias] = rel ? pickColumns(rel, parseSelect(emb.cols).columns) : null;
      } else if (emb.table === 'product_variants' && row.id) {
        out[emb.alias] = (this.db.product_variants || [])
          .filter((v) => v.product_id === row.id)
          .map((v) => pickColumns(v, parseSelect(emb.cols).columns));
      }
    }
    return out;
  }

  _execute() {
    if (this.pendingError) {
      return { data: null, error: this.pendingError, count: null };
    }

    let rows = this._rows();
    const total = rows.length;

    if (this.op === 'insert') {
      const inserted = this.payload.map((p) => ({
        id: p.id || uid(),
        created_at: p.created_at || iso(),
        updated_at: p.updated_at || iso(),
        ...p,
      }));
      this.db[this.table].push(...inserted);
      persistDemoDb();
      const data = inserted.map((r) => this._applyEmbeds(r));
      return this._wrap(data, total);
    }

    if (this.op === 'upsert') {
      const conflictCols = (this.upsertOptions?.onConflict || 'id').split(',').map((s) => s.trim());
      const result = [];
      for (const p of this.payload) {
        const existing = this.db[this.table].find((r) =>
          conflictCols.every((c) => r[c] === (p[c] ?? r[c]))
        );
        if (existing) {
          Object.assign(existing, p, { updated_at: iso() });
          result.push(existing);
        } else {
          const row = { id: p.id || uid(), created_at: iso(), updated_at: iso(), ...p };
          this.db[this.table].push(row);
          result.push(row);
        }
      }
      persistDemoDb();
      return this._wrap(result.map((r) => this._applyEmbeds(r)), total);
    }

    if (this.op === 'update') {
      const updated = rows.map((r) => Object.assign(r, this.payload, { updated_at: iso() }));
      persistDemoDb();
      return this._wrap(updated.map((r) => this._applyEmbeds(r)), total);
    }

    if (this.op === 'delete') {
      this.db[this.table] = this.db[this.table].filter((r) => !rows.includes(r));
      persistDemoDb();
      return this._wrap(rows.map((r) => this._applyEmbeds(r)), total);
    }

    // select
    rows = this._sort(rows);
    if (this.rangeFrom !== null) rows = rows.slice(this.rangeFrom, (this.rangeTo ?? rows.length - 1) + 1);
    if (this.limitN !== null) rows = rows.slice(0, this.limitN);
    return this._wrap(rows.map((r) => this._applyEmbeds(r)), total);
  }

  _wrap(data, count) {
    if (this.singleRow || this.optionalSingle) {
      const row = data[0] ?? null;
      if (this.singleRow && !row) {
        return { data: null, error: { message: 'Row not found' }, count };
      }
      return { data: row, error: null, count };
    }
    return { data, error: null, count: this.countWanted ? count : null };
  }

  then(resolve, reject) {
    try {
      resolve(this._execute());
    } catch (err) {
      if (reject) reject(err);
      else resolve({ data: null, error: { message: err.message } });
    }
  }
}

// ── RPC implementations (mirror the SQL functions) ──────────
function rpcNextInvoiceNumber() {
  const s = demoDb.shop_settings[0];
  const n = s.invoice_next_number;
  s.invoice_next_number = n + 1;
  s.updated_at = iso();
  persistDemoDb();
  const prefix = (s.invoice_prefix || 'INV-YYYY-').replace(/YYYY/g, String(new Date().getFullYear()));
  return `${prefix}${String(n).padStart(5, '0')}`;
}

function rpcCreateInvoice(args) {
  const number = rpcNextInvoiceNumber();
  const items = args.p_items || [];
  const invoice = {
    id: uid(),
    user_id: DEMO_USER.id,
    invoice_number: number,
    customer_id: args.p_customer_id || null,
    customer_name: args.p_customer_name || 'Walk-in Customer',
    customer_mobile: args.p_customer_mobile || '',
    customer_email: args.p_customer_email || '',
    customer_address: args.p_customer_address || '',
    subtotal: Number(args.p_subtotal),
    discount_amount: Number(args.p_discount_amount),
    tax_amount: Number(args.p_tax_amount),
    total_amount: Number(args.p_total_amount),
    payment_method: args.p_payment_method,
    payment_status: args.p_payment_status || 'paid',
    status: 'completed',
    notes: args.p_notes || '',
    transaction_reference: args.p_transaction_reference || '',
    final_amount_override: args.p_final_amount_override ?? null,
    calculated_amount: args.p_calculated_amount ?? Number(args.p_total_amount),
    created_at: iso(),
    updated_at: iso(),
  };
  demoDb.invoices.push(invoice);

  for (const it of items) {
    demoDb.invoice_items.push({
      id: uid(),
      user_id: DEMO_USER.id,
      invoice_id: invoice.id,
      product_id: it.product_id || null,
      variant_id: it.variant_id || null,
      product_name: it.product_name,
      sku: it.sku || '',
      size: it.size || '',
      color: it.color || '',
      quantity: Number(it.quantity),
      unit_price: Number(it.unit_price),
      discount_amount: Number(it.discount_amount || 0),
      total_amount: Number(it.total_amount || 0),
      created_at: iso(),
    });

    const qty = Number(it.quantity);
    if (it.variant_id) {
      const v = demoDb.product_variants.find((x) => x.id === it.variant_id);
      if (v) v.stock_quantity = Math.max(v.stock_quantity - qty, 0);
    }
    if (it.product_id) {
      const p = demoDb.products.find((x) => x.id === it.product_id);
      if (p) {
        const prev = p.stock_quantity;
        p.stock_quantity = Math.max(prev - qty, 0);
        // One history row per line item (variant noted on the row)
        demoDb.inventory_transactions.push({
          id: uid(),
          user_id: DEMO_USER.id,
          product_id: p.id,
          variant_id: it.variant_id || null,
          change: -qty,
          previous_qty: prev,
          new_qty: p.stock_quantity,
          reason: 'sale',
          notes: `Sale — ${number}`,
          invoice_id: invoice.id,
          created_by: DEMO_USER.id,
          created_at: iso(),
        });
      }
    }
  }

  demoDb.payments.push({
    id: uid(),
    user_id: DEMO_USER.id,
    invoice_id: invoice.id,
    amount: invoice.total_amount,
    method: invoice.payment_method,
    reference: '',
    notes: '',
    paid_at: iso(),
    created_at: iso(),
  });

  if (args.p_customer_id) {
    const c = demoDb.customers.find((x) => x.id === args.p_customer_id);
    if (c) {
      c.total_purchases = Number((c.total_purchases + invoice.total_amount).toFixed(2));
      c.total_orders += 1;
      c.last_purchase_at = invoice.created_at;
    }
  }

  demoDb.activity_log.push({
    id: uid(),
    user_id: DEMO_USER.id,
    action_type: 'invoice_created',
    entity_type: 'invoice',
    entity_id: invoice.id,
    description: `New invoice ${number} generated for ${invoice.customer_name}`,
    created_at: iso(),
  });

  persistDemoDb();
  return invoice;
}

function rpcUpdateInvoiceStatus(args) {
  const inv = demoDb.invoices.find((i) => i.id === args.p_invoice_id);
  if (!inv) return null;
  const old = inv.status;
  const next = args.p_status;
  if (old === next) return inv;

  const items = demoDb.invoice_items.filter((i) => i.invoice_id === inv.id);
  const toRestock = next === 'returned' || next === 'cancelled';
  const reDeduct = old === 'returned' || (old === 'cancelled' && next === 'completed');

  if (toRestock && old !== 'returned' && old !== 'cancelled') {
    for (const it of items) {
      const p = demoDb.products.find((x) => x.id === it.product_id);
      if (p) {
        const prev = p.stock_quantity;
        p.stock_quantity += it.quantity;
        demoDb.inventory_transactions.push({
          id: uid(),
          user_id: DEMO_USER.id,
          product_id: p.id,
          variant_id: it.variant_id,
          change: it.quantity,
          previous_qty: prev,
          new_qty: p.stock_quantity,
          reason: next === 'returned' ? 'return' : 'cancellation',
          notes: args.p_reason || `Invoice ${next}`,
          invoice_id: inv.id,
          created_by: DEMO_USER.id,
          created_at: iso(),
        });
      }
      const v = it.variant_id && demoDb.product_variants.find((x) => x.id === it.variant_id);
      if (v) v.stock_quantity += it.quantity;
    }
    const c = inv.customer_id && demoDb.customers.find((x) => x.id === inv.customer_id);
    if (c) {
      c.total_purchases = Math.max(Number((c.total_purchases - inv.total_amount).toFixed(2)), 0);
      c.total_orders = Math.max(c.total_orders - 1, 0);
    }
  }

  if (reDeduct && next === 'completed') {
    for (const it of items) {
      const p = demoDb.products.find((x) => x.id === it.product_id);
      if (p) p.stock_quantity = Math.max(p.stock_quantity - it.quantity, 0);
      const v = it.variant_id && demoDb.product_variants.find((x) => x.id === it.variant_id);
      if (v) v.stock_quantity = Math.max(v.stock_quantity - it.quantity, 0);
    }
    const c = inv.customer_id && demoDb.customers.find((x) => x.id === inv.customer_id);
    if (c) {
      c.total_purchases = Number((c.total_purchases + inv.total_amount).toFixed(2));
      c.total_orders += 1;
      c.last_purchase_at = iso();
    }
  }

  inv.status = next;
  inv.payment_status = next === 'completed' ? 'paid' : toRestock ? 'pending' : inv.payment_status;
  inv.updated_at = iso();

  demoDb.activity_log.push({
    id: uid(),
    user_id: DEMO_USER.id,
    action_type: `invoice_${next}`,
    entity_type: 'invoice',
    entity_id: inv.id,
    description: `Invoice ${inv.invoice_number} marked ${next}${args.p_reason ? ` — ${args.p_reason}` : ''}`,
    created_at: iso(),
  });

  persistDemoDb();
  return inv;
}

function rpcAdjustStock(args) {
  const p = demoDb.products.find((x) => x.id === args.p_product_id);
  if (!p) return null;
  const prev = p.stock_quantity;
  p.stock_quantity = Number(args.p_new_qty);
  demoDb.inventory_transactions.push({
    id: uid(),
    user_id: DEMO_USER.id,
    product_id: p.id,
    variant_id: args.p_variant_id || null,
    change: p.stock_quantity - prev,
    previous_qty: prev,
    new_qty: p.stock_quantity,
    reason: args.p_reason || 'adjustment',
    notes: args.p_notes || '',
    invoice_id: null,
    created_by: DEMO_USER.id,
    created_at: iso(),
  });
  persistDemoDb();
  return null;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function rpcDashboardStats() {
  const inv = demoDb.invoices;
  const today = startOfToday().toISOString();
  const todayInv = inv.filter((i) => i.created_at >= today);
  const completed = inv.filter((i) => i.status === 'completed');
  const products = demoDb.products.filter((p) => p.status === 'active');
  const sum = (rows) => rows.reduce((a, r) => a + Number(r.total_amount || 0), 0);

  const todayItems = demoDb.invoice_items.filter((ii) =>
    todayInv.some((i) => i.id === ii.invoice_id && i.status === 'completed')
  );

  return {
    today_sales: todayInv.filter((i) => i.status === 'completed').length,
    today_orders: todayInv.length,
    today_revenue: sum(todayInv.filter((i) => i.status === 'completed')),
    today_units: todayItems.reduce((a, r) => a + r.quantity, 0),
    total_revenue: sum(completed),
    total_customers: demoDb.customers.length,
    total_products: products.length,
    low_stock: products.filter((p) => p.stock_quantity > 0 && p.stock_quantity <= p.min_stock_level).length,
    out_of_stock: products.filter((p) => p.stock_quantity === 0).length,
    low_stock_variants: demoDb.product_variants.filter((v) => v.stock_quantity === 0).length,
    pending_payments: sum(inv.filter((i) => i.payment_status === 'pending')),
    pending_count: inv.filter((i) => i.payment_status === 'pending').length,
    completed_orders: inv.filter((i) => i.status === 'completed').length,
    cancelled_orders: inv.filter((i) => i.status === 'cancelled').length,
    returned_orders: inv.filter((i) => i.status === 'returned').length,
    total_orders: inv.length,
    stock_value: products.reduce((a, p) => a + p.stock_quantity * Number(p.purchase_price || 0), 0),
  };
}

function rpcRevenueSeries(period) {
  const nowD = new Date();
  const completed = demoDb.invoices.filter((i) => i.status === 'completed');
  let from;
  let mode;
  if (period === 'today') {
    from = startOfToday();
    mode = 'hour';
  } else if (period === '7d') {
    from = startOfToday();
    from.setDate(from.getDate() - 6);
    mode = 'day';
  } else if (period === '30d') {
    from = startOfToday();
    from.setDate(from.getDate() - 29);
    mode = 'day';
  } else if (period === '90d') {
    from = startOfToday();
    from.setDate(from.getDate() - 89);
    mode = 'week';
  } else {
    from = new Date(nowD.getFullYear(), 0, 1);
    mode = 'month';
  }

  const buckets = new Map();
  for (const i of completed) {
    const d = new Date(i.created_at);
    if (d < from) continue;
    let key;
    if (mode === 'hour') {
      key = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } else if (mode === 'day') {
      key = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
    } else if (mode === 'week') {
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      key = weekStart.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
    } else {
      key = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    const cur = buckets.get(key) || { bucket: key, revenue: 0, orders: 0, sort: d.getTime() };
    cur.revenue = Number((cur.revenue + Number(i.total_amount)).toFixed(2));
    cur.orders += 1;
    buckets.set(key, cur);
  }

  // Fill gaps for day/hour series so charts look continuous
  if (mode === 'day') {
    const days = period === '7d' ? 7 : 30;
    const out = [];
    for (let k = days - 1; k >= 0; k -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - k);
      const key = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
      out.push(buckets.get(key) || { bucket: key, revenue: 0, orders: 0 });
    }
    return out;
  }

  return [...buckets.values()].sort((a, b) => a.sort - b.sort).map(({ sort, ...rest }) => rest);
}

function rpcTopProducts(limit) {
  const map = new Map();
  for (const ii of demoDb.invoice_items) {
    const inv = demoDb.invoices.find((i) => i.id === ii.invoice_id);
    if (!inv || inv.status !== 'completed') continue;
    const key = ii.product_id || ii.product_name;
    const cur = map.get(key) || { product_id: ii.product_id, product_name: ii.product_name, units: 0, revenue: 0 };
    cur.units += ii.quantity;
    cur.revenue = Number((cur.revenue + ii.total_amount).toFixed(2));
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => b.units - a.units).slice(0, limit || 5);
}

function rpcPaymentBreakdown() {
  const map = new Map();
  for (const i of demoDb.invoices) {
    if (i.status !== 'completed') continue;
    const cur = map.get(i.payment_method) || { method: i.payment_method, total: 0, count: 0 };
    cur.total = Number((cur.total + Number(i.total_amount)).toFixed(2));
    cur.count += 1;
    map.set(i.payment_method, cur);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

function rpcMonthlySales() {
  const map = new Map();
  const year = new Date().getFullYear();
  for (const i of demoDb.invoices) {
    if (i.status !== 'completed') continue;
    const d = new Date(i.created_at);
    if (d.getFullYear() !== year) continue;
    const key = d.toLocaleDateString('en-US', { month: 'short' });
    const cur = map.get(key) || { month: key, revenue: 0, orders: 0, sort: d.getMonth() };
    cur.revenue = Number((cur.revenue + Number(i.total_amount)).toFixed(2));
    cur.orders += 1;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => a.sort - b.sort).map(({ sort, ...rest }) => rest);
}

const RPCS = {
  next_invoice_number: () => rpcNextInvoiceNumber(),
  create_invoice: rpcCreateInvoice,
  update_invoice_status: rpcUpdateInvoiceStatus,
  adjust_stock: rpcAdjustStock,
  get_dashboard_stats: rpcDashboardStats,
  get_revenue_series: (args) => rpcRevenueSeries(args?.p_period || '7d'),
  get_top_products: (args) => rpcTopProducts(args?.p_limit || 5),
  get_payment_breakdown: () => rpcPaymentBreakdown(),
  get_monthly_sales: () => rpcMonthlySales(),
};

// ── auth shim ───────────────────────────────────────────────
const authListeners = new Set();
let demoSession = null;
try {
  if (localStorage.getItem(AUTH_KEY) === '1') demoSession = { user: DEMO_USER };
} catch {
  /* ignore */
}

function notifyAuth(event, session) {
  for (const cb of authListeners) {
    try {
      cb(event, session);
    } catch {
      /* ignore listener errors */
    }
  }
}

const demoAuth = {
  async getSession() {
    return { data: { session: demoSession }, error: null };
  },
  async getUser() {
    return { data: { user: demoSession?.user || null }, error: null };
  },
  onAuthStateChange(cb) {
    authListeners.add(cb);
    return {
      data: {
        subscription: {
          unsubscribe: () => authListeners.delete(cb),
        },
      },
    };
  },
  async signInWithPassword({ email }) {
    demoSession = { user: { ...DEMO_USER, email: email || DEMO_USER.email } };
    try {
      localStorage.setItem(AUTH_KEY, '1');
    } catch {
      /* ignore */
    }
    notifyAuth('SIGNED_IN', demoSession);
    return { data: { session: demoSession, user: demoSession.user }, error: null };
  },
  async signUp({ email }) {
    return demoAuth.signInWithPassword({ email });
  },
  async signOut() {
    demoSession = null;
    try {
      localStorage.removeItem(AUTH_KEY);
    } catch {
      /* ignore */
    }
    notifyAuth('SIGNED_OUT', null);
    return { error: null };
  },
  async resetPasswordForEmail() {
    return { data: {}, error: null };
  },
  async updateUser() {
    return { data: { user: demoSession?.user }, error: null };
  },
};

// ── storage shim ────────────────────────────────────────────
const demoStorageFiles = new Map();

const demoStorage = {
  from(bucket) {
    return {
      async upload(path, file) {
        demoStorageFiles.set(`${bucket}/${path}`, URL.createObjectURL(file));
        return { data: { path }, error: null };
      },
      getPublicUrl(path) {
        return {
          data: { publicUrl: demoStorageFiles.get(`${bucket}/${path}`) || '' },
          error: null,
        };
      },
      async remove() {
        return { data: null, error: null };
      },
    };
  },
};

// ── client ──────────────────────────────────────────────────
export const demoClient = {
  from(table) {
    if (!demoDb[table]) demoDb[table] = [];
    return new DemoQuery(demoDb, table);
  },
  rpc(name, args) {
    const fn = RPCS[name];
    if (!fn) {
      return Promise.resolve({ data: null, error: { message: `Demo RPC not implemented: ${name}` } });
    }
    try {
      return Promise.resolve({ data: fn(args), error: null });
    } catch (err) {
      return Promise.resolve({ data: null, error: { message: err.message } });
    }
  },
  auth: demoAuth,
  storage: demoStorage,
};
