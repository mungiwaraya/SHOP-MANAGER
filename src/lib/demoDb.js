/**
 * Demo data store — IN-MEMORY + localStorage persistence.
 *
 * ⚠️ ACTIVE ONLY WHEN SUPABASE ENV VARS ARE MISSING.
 * When VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are configured, this file
 * is never used and ALL data flows through real Supabase + RLS.
 *
 * It exists so the full UI (billing, invoices, analytics, PDFs, WhatsApp)
 * can be explored and tested before a Supabase project is connected.
 */

const STORAGE_KEY = 'shop-manager-demo-db';

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
const now = () => new Date().toISOString();
const daysAgo = (n, hour = 11) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, (n * 17) % 60, 0, 0);
  return d.toISOString();
};

const DEMO_USER_ID = 'demo-admin-0001';

function buildSeed() {
  const products = [
    { id: uid(), user_id: DEMO_USER_ID, name: 'Classic Cotton Round Neck T-Shirt', sku: 'TSH-001', subcategory: 'Casual', brand: 'UrbanWeave', description: 'Soft 240 GSM cotton tee for everyday wear.', image_url: '', purchase_price: 240, selling_price: 499, discount_percent: 10, stock_quantity: 42, min_stock_level: 10, status: 'active', has_variants: true, category_id: 'cat-tshirts', created_at: daysAgo(120), updated_at: daysAgo(3) },
    { id: uid(), user_id: DEMO_USER_ID, name: 'Slim Fit Formal Shirt', sku: 'SHT-014', subcategory: 'Formal', brand: 'NorthLine', description: 'Wrinkle-resistant formal shirt, perfect for office.', image_url: '', purchase_price: 420, selling_price: 899, discount_percent: 0, stock_quantity: 18, min_stock_level: 6, status: 'active', has_variants: true, category_id: 'cat-shirts', created_at: daysAgo(95), updated_at: daysAgo(6) },
    { id: uid(), user_id: DEMO_USER_ID, name: 'Stretch Denim Jeans — Dark Blue', sku: 'JNS-022', subcategory: 'Denim', brand: 'UrbanWeave', description: 'Comfort-stretch denim with a modern taper.', image_url: '', purchase_price: 650, selling_price: 1299, discount_percent: 5, stock_quantity: 4, min_stock_level: 6, status: 'active', has_variants: true, category_id: 'cat-jeans', created_at: daysAgo(88), updated_at: daysAgo(1) },
    { id: uid(), user_id: DEMO_USER_ID, name: 'Printed Summer Kurti', sku: 'KRT-007', subcategory: 'Ethnic', brand: 'Rangoli', description: 'Breathable rayon kurti with hand-block print.', image_url: '', purchase_price: 310, selling_price: 749, discount_percent: 15, stock_quantity: 23, min_stock_level: 8, status: 'active', has_variants: true, category_id: 'cat-ethnic', created_at: daysAgo(76), updated_at: daysAgo(9) },
    { id: uid(), user_id: DEMO_USER_ID, name: 'Lightweight Zip Hoodie', sku: 'HOD-003', subcategory: 'Winterwear', brand: 'NorthLine', description: 'Fleece-lined hoodie for cool evenings.', image_url: '', purchase_price: 520, selling_price: 1099, discount_percent: 0, stock_quantity: 0, min_stock_level: 5, status: 'active', has_variants: true, category_id: 'cat-winter', created_at: daysAgo(64), updated_at: daysAgo(2) },
    { id: uid(), user_id: DEMO_USER_ID, name: 'Sports Track Pants', sku: 'TRK-011', subcategory: 'Activewear', brand: 'SwiftFit', description: 'Quick-dry track pants with zip pockets.', image_url: '', purchase_price: 380, selling_price: 799, discount_percent: 10, stock_quantity: 31, min_stock_level: 10, status: 'active', has_variants: true, category_id: 'cat-activewear', created_at: daysAgo(52), updated_at: daysAgo(4) },
    { id: uid(), user_id: DEMO_USER_ID, name: 'Premium Silk Saree', sku: 'SRE-101', subcategory: 'Ethnic', brand: 'Rangoli', description: 'Pure silk blend saree with zari border.', image_url: '', purchase_price: 1450, selling_price: 2999, discount_percent: 5, stock_quantity: 9, min_stock_level: 3, status: 'active', has_variants: false, category_id: 'cat-ethnic', created_at: daysAgo(47), updated_at: daysAgo(11) },
    { id: uid(), user_id: DEMO_USER_ID, name: 'Graphic Print Oversized Tee', sku: 'TSH-033', subcategory: 'Streetwear', brand: 'UrbanWeave', description: 'Drop-shoulder oversized tee with bold graphic.', image_url: '', purchase_price: 270, selling_price: 599, discount_percent: 0, stock_quantity: 27, min_stock_level: 8, status: 'active', has_variants: true, category_id: 'cat-tshirts', created_at: daysAgo(35), updated_at: daysAgo(2) },
    { id: uid(), user_id: DEMO_USER_ID, name: 'Casual Loafers', sku: 'SHO-045', subcategory: 'Footwear', brand: 'StepOn', description: 'Comfort-cushion loafers for daily use.', image_url: '', purchase_price: 580, selling_price: 1199, discount_percent: 12, stock_quantity: 14, min_stock_level: 5, status: 'active', has_variants: true, category_id: 'cat-footwear', created_at: daysAgo(30), updated_at: daysAgo(7) },
    { id: uid(), user_id: DEMO_USER_ID, name: 'Leather Formal Belt', sku: 'BLT-002', subcategory: 'Accessories', brand: 'StepOn', description: 'Genuine leather belt with brushed buckle.', image_url: '', purchase_price: 190, selling_price: 449, discount_percent: 0, stock_quantity: 36, min_stock_level: 10, status: 'active', has_variants: false, category_id: 'cat-accessories', created_at: daysAgo(22), updated_at: daysAgo(2) },
    { id: uid(), user_id: DEMO_USER_ID, name: 'Winter Puffer Jacket', sku: 'JKT-017', subcategory: 'Winterwear', brand: 'NorthLine', description: 'Water-resistant puffer with thermal lining.', image_url: '', purchase_price: 980, selling_price: 1999, discount_percent: 10, stock_quantity: 3, min_stock_level: 4, status: 'active', has_variants: true, category_id: 'cat-winter', created_at: daysAgo(16), updated_at: daysAgo(1) },
    { id: uid(), user_id: DEMO_USER_ID, name: 'Cotton Palazzo Pants', sku: 'PLZ-008', subcategory: 'Casual', brand: 'Rangoli', description: 'Flowy palazzo with elastic waistband.', image_url: '', purchase_price: 280, selling_price: 649, discount_percent: 0, stock_quantity: 19, min_stock_level: 6, status: 'active', has_variants: true, category_id: 'cat-ethnic', created_at: daysAgo(10), updated_at: daysAgo(1) },
    { id: uid(), user_id: DEMO_USER_ID, name: 'Running Sneakers Pro', sku: 'SHO-052', subcategory: 'Footwear', brand: 'SwiftFit', description: 'Cushioned sole sneakers for running & gym.', image_url: '', purchase_price: 720, selling_price: 1599, discount_percent: 8, stock_quantity: 0, min_stock_level: 5, status: 'active', has_variants: true, category_id: 'cat-footwear', created_at: daysAgo(6), updated_at: daysAgo(1) },
    { id: uid(), user_id: DEMO_USER_ID, name: 'Designer Clutch Bag', sku: 'BAG-019', subcategory: 'Accessories', brand: 'Rangoli', description: 'Evening clutch with detachable chain.', image_url: '', purchase_price: 340, selling_price: 899, discount_percent: 0, stock_quantity: 11, min_stock_level: 4, status: 'active', has_variants: false, category_id: 'cat-accessories', created_at: daysAgo(3), updated_at: daysAgo(1) },
    { id: uid(), user_id: DEMO_USER_ID, name: 'Checked Flannel Shirt (Last Season)', sku: 'SHT-021', subcategory: 'Casual', brand: 'NorthLine', description: 'Discontinued design — clearance stock.', image_url: '', purchase_price: 320, selling_price: 699, discount_percent: 25, stock_quantity: 7, min_stock_level: 3, status: 'inactive', has_variants: true, category_id: 'cat-shirts', created_at: daysAgo(140), updated_at: daysAgo(30) },
  ];

  const categories = [
    { id: 'cat-tshirts', user_id: DEMO_USER_ID, name: 'T-Shirts', created_at: daysAgo(130), updated_at: daysAgo(130) },
    { id: 'cat-shirts', user_id: DEMO_USER_ID, name: 'Shirts', created_at: daysAgo(130), updated_at: daysAgo(130) },
    { id: 'cat-jeans', user_id: DEMO_USER_ID, name: 'Jeans & Trousers', created_at: daysAgo(130), updated_at: daysAgo(130) },
    { id: 'cat-ethnic', user_id: DEMO_USER_ID, name: 'Ethnic Wear', created_at: daysAgo(130), updated_at: daysAgo(130) },
    { id: 'cat-winter', user_id: DEMO_USER_ID, name: 'Winterwear', created_at: daysAgo(130), updated_at: daysAgo(130) },
    { id: 'cat-activewear', user_id: DEMO_USER_ID, name: 'Activewear', created_at: daysAgo(130), updated_at: daysAgo(130) },
    { id: 'cat-footwear', user_id: DEMO_USER_ID, name: 'Footwear', created_at: daysAgo(120), updated_at: daysAgo(120) },
    { id: 'cat-accessories', user_id: DEMO_USER_ID, name: 'Accessories', created_at: daysAgo(120), updated_at: daysAgo(120) },
  ];

  const variantSpec = {
    'TSH-001': [['S', 'Black', 8], ['M', 'Black', 10], ['L', 'Navy', 9], ['XL', 'Grey', 8], ['XXL', 'Black', 7]],
    'SHT-014': [['S', 'White', 4], ['M', 'White', 5], ['L', 'Sky Blue', 5], ['XL', 'White', 4]],
    'JNS-022': [['30', 'Dark Blue', 1], ['32', 'Dark Blue', 1], ['34', 'Dark Blue', 1], ['36', 'Dark Blue', 1]],
    'KRT-007': [['S', 'Mustard', 5], ['M', 'Mustard', 6], ['L', 'Teal', 6], ['XL', 'Mustard', 6]],
    'HOD-003': [['M', 'Charcoal', 0], ['L', 'Charcoal', 0], ['XL', 'Olive', 0]],
    'TRK-011': [['M', 'Black', 10], ['L', 'Black', 11], ['XL', 'Navy', 10]],
    'TSH-033': [['S', 'Off White', 6], ['M', 'Off White', 7], ['L', 'Black', 7], ['XL', 'Off White', 7]],
    'SHO-045': [['7', 'Brown', 5], ['8', 'Brown', 5], ['9', 'Black', 4], ['10', 'Black', 0]],
    'JKT-017': [['M', 'Black', 1], ['L', 'Black', 1], ['XL', 'Olive', 1]],
    'PLZ-008': [['S', 'Off White', 5], ['M', 'Off White', 5], ['L', 'Black', 5], ['XL', 'Off White', 4]],
    'SHO-052': [['7', 'Grey/Orange', 0], ['8', 'Grey/Orange', 0], ['9', 'Black/Volt', 0]],
    'SHT-021': [['M', 'Red Check', 3], ['L', 'Red Check', 2], ['XL', 'Green Check', 2]],
  };

  const variants = [];
  for (const p of products) {
    const spec = variantSpec[p.sku];
    if (!spec) continue;
    for (const [size, color, qty] of spec) {
      variants.push({
        id: uid(),
        user_id: DEMO_USER_ID,
        product_id: p.id,
        size,
        color,
        sku_suffix: `${size}-${color.slice(0, 2).toUpperCase()}`,
        stock_quantity: qty,
        price_override: null,
        created_at: p.created_at,
        updated_at: p.updated_at,
      });
    }
  }

  const customers = [
    { id: uid(), user_id: DEMO_USER_ID, name: 'Rahul Sharma', mobile: '9876543210', email: 'rahul.sharma@gmail.com', address: '12 Ring Road, Surat', notes: '', created_at: daysAgo(110), updated_at: daysAgo(2), total_purchases: 0, total_orders: 0, last_purchase_at: null },
    { id: uid(), user_id: DEMO_USER_ID, name: 'Priya Patel', mobile: '9825012345', email: 'priya.patel@gmail.com', address: 'Athwa Lines, Surat', notes: 'Prefers WhatsApp invoices', created_at: daysAgo(95), updated_at: daysAgo(5), total_purchases: 0, total_orders: 0, last_purchase_at: null },
    { id: uid(), user_id: DEMO_USER_ID, name: 'Amit Mehta', mobile: '9909876543', email: '', address: 'Adajan, Surat', notes: '', created_at: daysAgo(80), updated_at: daysAgo(12), total_purchases: 0, total_orders: 0, last_purchase_at: null },
    { id: uid(), user_id: DEMO_USER_ID, name: 'Sneha Desai', mobile: '9712345678', email: 'sneha.desai@gmail.com', address: 'Vesu, Surat', notes: '', created_at: daysAgo(70), updated_at: daysAgo(1), total_purchases: 0, total_orders: 0, last_purchase_at: null },
    { id: uid(), user_id: DEMO_USER_ID, name: 'Vikram Singh', mobile: '9898765432', email: 'vikram.singh@gmail.com', address: 'Piplod, Surat', notes: 'Bulk buyer — corporate orders', created_at: daysAgo(55), updated_at: daysAgo(3), total_purchases: 0, total_orders: 0, last_purchase_at: null },
    { id: uid(), user_id: DEMO_USER_ID, name: 'Ananya Joshi', mobile: '9601234567', email: 'ananya.joshi@gmail.com', address: 'Ghod Dod Road, Surat', notes: '', created_at: daysAgo(40), updated_at: daysAgo(8), total_purchases: 0, total_orders: 0, last_purchase_at: null },
    { id: uid(), user_id: DEMO_USER_ID, name: 'Karan Kapoor', mobile: '9723456789', email: '', address: 'Nanpura, Surat', notes: '', created_at: daysAgo(28), updated_at: daysAgo(6), total_purchases: 0, total_orders: 0, last_purchase_at: null },
    { id: uid(), user_id: DEMO_USER_ID, name: 'Meera Iyer', mobile: '9512345670', email: 'meera.iyer@gmail.com', address: 'Althan, Surat', notes: 'Regular customer', created_at: daysAgo(14), updated_at: daysAgo(2), total_purchases: 0, total_orders: 0, last_purchase_at: null },
  ];

  // ── Generate invoices across the past year ────────────────
  const invoices = [];
  const invoice_items = [];
  const payments = [];
  const activity_log = [];
  const inventory_transactions = [];

  const payMethods = ['cash', 'upi', 'card', 'upi', 'cash', 'bank_transfer', 'upi', 'card'];
  let invSeq = 1;

  const makeInvoice = (dayOffset, customer, lines, status = 'completed', method) => {
    const created = daysAgo(dayOffset, 9 + (dayOffset % 10));
    const invoiceId = uid();
    let subtotal = 0;
    let discountTotal = 0;

    for (const line of lines) {
      const gross = line.unit_price * line.quantity;
      const disc = (gross * (line.discountPct || 0)) / 100;
      subtotal += gross;
      discountTotal += disc;
      invoice_items.push({
        id: uid(),
        user_id: DEMO_USER_ID,
        invoice_id: invoiceId,
        product_id: line.product_id,
        variant_id: line.variant_id || null,
        product_name: line.product_name,
        sku: line.sku,
        size: line.size || '',
        color: line.color || '',
        quantity: line.quantity,
        unit_price: line.unit_price,
        discount_amount: Number(disc.toFixed(2)),
        total_amount: Number((gross - disc).toFixed(2)),
        created_at: created,
      });
    }

    const total = subtotal - discountTotal;
    const invoice = {
      id: invoiceId,
      user_id: DEMO_USER_ID,
      invoice_number: `INV-${new Date(created).getFullYear()}-${String(invSeq).padStart(5, '0')}`,
      customer_id: customer?.id || null,
      customer_name: customer?.name || 'Walk-in Customer',
      customer_mobile: customer?.mobile || '',
      customer_email: customer?.email || '',
      customer_address: customer?.address || '',
      subtotal: Number(subtotal.toFixed(2)),
      discount_amount: Number(discountTotal.toFixed(2)),
      tax_amount: 0,
      total_amount: Number(total.toFixed(2)),
      payment_method: method || payMethods[invSeq % payMethods.length],
      payment_status: status === 'completed' ? 'paid' : 'pending',
      status,
      notes: '',
      created_at: created,
      updated_at: created,
    };
    invoices.push(invoice);

    payments.push({
      id: uid(),
      user_id: DEMO_USER_ID,
      invoice_id: invoiceId,
      amount: invoice.total_amount,
      method: invoice.payment_method,
      reference: '',
      notes: '',
      paid_at: created,
      created_at: created,
    });

    if (customer && status === 'completed') {
      customer.total_purchases = Number((customer.total_purchases + total).toFixed(2));
      customer.total_orders += 1;
      customer.last_purchase_at = created;
    }

    activity_log.push({
      id: uid(),
      user_id: DEMO_USER_ID,
      action_type: status === 'returned' ? 'invoice_returned' : status === 'cancelled' ? 'invoice_cancelled' : 'invoice_created',
      entity_type: 'invoice',
      entity_id: invoiceId,
      description: `Invoice ${invoice.invoice_number} ${status === 'completed' ? 'generated' : 'marked ' + status} for ${invoice.customer_name}`,
      created_at: created,
    });

    invSeq += 1;
    return invoice;
  };

  const P = (sku) => products.find((p) => p.sku === sku);
  const V = (sku, size) => variants.find((v) => v.product_id === P(sku).id && v.size === size);
  const line = (sku, qty, size, discountPct = 0) => {
    const product = P(sku);
    const variant = size ? V(sku, size) : null;
    return {
      product_id: product.id,
      variant_id: variant?.id || null,
      product_name: product.name,
      sku: product.sku,
      size: variant?.size || '',
      color: variant?.color || '',
      quantity: qty,
      unit_price: product.selling_price,
      discountPct,
    };
  };

  // Realistic spread of sales — recent ones to power "Today" stats
  makeInvoice(0, customers[0], [line('TSH-001', 2, 'M'), line('BLT-002', 1)], 'completed', 'upi');
  makeInvoice(0, null, [line('KRT-007', 1, 'L')], 'completed', 'cash');
  makeInvoice(0, customers[1], [line('SRE-101', 1)], 'completed', 'card');
  makeInvoice(1, customers[3], [line('JNS-022', 1, '32'), line('TSH-033', 2, 'M')], 'completed', 'upi');
  makeInvoice(1, customers[4], [line('TRK-011', 3, 'L')], 'completed', 'bank_transfer');
  makeInvoice(2, customers[0], [line('SHT-014', 2, 'L', 10)], 'completed', 'upi');
  makeInvoice(2, customers[2], [line('SHO-045', 1, '8')], 'completed', 'cash');
  makeInvoice(3, customers[5], [line('PLZ-008', 2, 'M'), line('KRT-007', 1, 'S', 15)], 'completed', 'card');
  makeInvoice(4, customers[6], [line('HOD-003', 1, 'L')], 'completed', 'cash');
  makeInvoice(5, customers[7], [line('TSH-001', 3, 'S', 10), line('BLT-002', 1)], 'completed', 'upi');
  makeInvoice(6, customers[1], [line('JKT-017', 1, 'M', 10)], 'completed', 'upi');
  makeInvoice(7, customers[4], [line('SHT-014', 2, 'XL')], 'returned', 'cash');
  makeInvoice(8, customers[3], [line('SHO-052', 1, '8', 8)], 'completed', 'card');
  makeInvoice(9, null, [line('TSH-033', 2, 'L')], 'completed', 'cash');
  makeInvoice(11, customers[2], [line('PLZ-008', 1, 'XL'), line('KRT-007', 1, 'XL')], 'completed', 'upi');
  makeInvoice(13, customers[5], [line('TRK-011', 1, 'M', 10)], 'completed', 'upi');
  makeInvoice(16, customers[0], [line('SRE-101', 1, null, 5)], 'completed', 'bank_transfer');
  makeInvoice(20, customers[6], [line('TSH-001', 4, 'L', 10)], 'completed', 'card');
  makeInvoice(24, customers[7], [line('SHT-021', 1, 'L', 25)], 'cancelled', 'cash');
  makeInvoice(28, customers[4], [line('BLT-002', 2)], 'completed', 'upi');
  makeInvoice(33, customers[1], [line('KRT-007', 2, 'M', 15)], 'completed', 'cash');
  makeInvoice(38, customers[3], [line('JNS-022', 1, '34', 5)], 'completed', 'card');
  makeInvoice(45, customers[2], [line('TRK-011', 2, 'XL', 10)], 'completed', 'upi');
  makeInvoice(52, customers[0], [line('TSH-033', 1, 'S')], 'pending', 'cash');
  makeInvoice(60, customers[5], [line('HOD-003', 2, 'M')], 'completed', 'upi');
  makeInvoice(68, customers[6], [line('SHO-045', 1, '9', 12)], 'completed', 'cash');
  makeInvoice(76, customers[7], [line('SRE-101', 1)], 'completed', 'card');
  makeInvoice(84, customers[4], [line('TSH-001', 5, 'XXL', 10)], 'completed', 'bank_transfer');
  makeInvoice(95, customers[1], [line('PLZ-008', 2, 'S')], 'completed', 'upi');
  makeInvoice(110, customers[3], [line('SHT-014', 1, 'S')], 'completed', 'cash');

  activity_log.push({
    id: uid(),
    user_id: DEMO_USER_ID,
    action_type: 'product_added',
    entity_type: 'product',
    entity_id: P('BAG-019').id,
    description: 'Product Designer Clutch Bag added to catalog',
    created_at: daysAgo(3),
  });
  activity_log.push({
    id: uid(),
    user_id: DEMO_USER_ID,
    action_type: 'stock_updated',
    entity_type: 'product',
    entity_id: P('JNS-022').id,
    description: 'Stock adjusted for Stretch Denim Jeans — Dark Blue',
    created_at: daysAgo(1),
  });
  activity_log.push({
    id: uid(),
    user_id: DEMO_USER_ID,
    action_type: 'customer_added',
    entity_type: 'customer',
    entity_id: customers[7].id,
    description: 'Customer Meera Iyer added',
    created_at: daysAgo(14),
  });

  for (const p of products) {
    inventory_transactions.push({
      id: uid(),
      user_id: DEMO_USER_ID,
      product_id: p.id,
      variant_id: null,
      change: p.stock_quantity,
      previous_qty: 0,
      new_qty: p.stock_quantity,
      reason: 'purchase',
      notes: 'Initial stock',
      invoice_id: null,
      created_by: DEMO_USER_ID,
      created_at: p.created_at,
    });
  }

  const shop_settings = {
    id: uid(),
    user_id: DEMO_USER_ID,
    shop_name: 'Urban Threads',
    tagline: 'Fashion for everyday',
    address: '42 Textile Market Ring Road, Surat, Gujarat 395002',
    phone: '9876543210',
    email: 'hello@urbanthreads.in',
    website: 'https://urbanthreads.in',
    gstin: '24ABCDE1234F1Z5',
    logo_url: '',
    invoice_prefix: 'INV-YYYY-',
    invoice_next_number: invSeq,
    invoice_footer: 'Thank you for shopping with Urban Threads!',
    return_policy: 'Returns/exchanges accepted within 7 days with original invoice and tags intact. No returns on innerwear and accessories.',
    currency_symbol: '₹',
    currency_code: 'INR',
    tax_enabled: true,
    tax_rate: 5,
    tax_label: 'GST',
    theme_mode: 'light',
    primary_color: '#111114',
    accent_color: '#5b7cfa',
    border_radius: '16px',
    created_at: daysAgo(130),
    updated_at: now(),
  };

  return {
    profiles: [{ id: DEMO_USER_ID, full_name: 'Shop Admin', role: 'admin', created_at: daysAgo(130), updated_at: now() }],
    shop_settings: [shop_settings],
    categories,
    products,
    product_variants: variants,
    customers,
    invoices,
    invoice_items,
    payments,
    inventory_transactions,
    activity_log,
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* corrupted → rebuild */
  }
  const seed = buildSeed();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  } catch {
    /* storage full / unavailable — memory only */
  }
  return seed;
}

export const demoDb = load();

export function persistDemoDb() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(demoDb));
  } catch {
    /* ignore */
  }
}

export function resetDemoDb() {
  const seed = buildSeed();
  for (const key of Object.keys(demoDb)) demoDb[key] = seed[key];
  persistDemoDb();
}

export const DEMO_USER = {
  id: DEMO_USER_ID,
  email: 'admin@demo.shop',
  user_metadata: { full_name: 'Shop Admin' },
};
