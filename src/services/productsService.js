import { supabase } from '../lib/supabase';

const PRODUCT_SELECT = `
  *,
  category:categories(id, name),
  variants:product_variants(id, size, color, sku_suffix, stock_quantity, price_override)
`;

/** Paginated + searchable product list */
export async function listProducts({
  search = '',
  categoryId = '',
  status = '',
  stockFilter = '', // 'low' | 'out' | 'in'
  page = 1,
  perPage = 12,
  sort = 'created_at',
  order = 'desc',
} = {}) {
  let query = supabase.from('products').select(PRODUCT_SELECT, { count: 'exact' });

  if (search.trim()) {
    const q = search.trim().replace(/[%_,()]/g, ' ').trim();
    query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%,brand.ilike.%${q}%`);
  }
  if (categoryId) query = query.eq('category_id', categoryId);
  if (status) query = query.eq('status', status);
  if (stockFilter === 'out') query = query.eq('stock_quantity', 0);
  if (stockFilter === 'low') query = query.eq('is_low_stock', true);

  const from = (page - 1) * perPage;
  query = query.order(sort, { ascending: order === 'asc' }).range(from, from + perPage - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { products: data || [], count: count || 0 };
}

/** Lightweight list for POS product picker */
export async function searchProductsLite(search = '', limit = 24) {
  let query = supabase
    .from('products')
    .select('id, name, sku, selling_price, purchase_price, discount_percent, stock_quantity, image_url, status, has_variants, min_stock_level, variants:product_variants(id, size, color, stock_quantity, price_override)')
    .eq('status', 'active')
    .order('name')
    .limit(limit);

  if (search.trim()) {
    const q = search.trim().replace(/[%_,()]/g, ' ').trim();
    query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%,brand.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getProduct(id) {
  const { data, error } = await supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createProduct(payload) {
  const { data: { user } } = await supabase.auth.getUser();
  const { variants, category_name, ...product } = payload;
  let categoryId = product.category_id || null;

  // Create category on the fly if a new name was typed
  if (!categoryId && category_name?.trim()) {
    const { data: cat } = await supabase
      .from('categories')
      .upsert({ user_id: user.id, name: category_name.trim() }, { onConflict: 'user_id,name' })
      .select()
      .single();
    categoryId = cat?.id || null;
  }

  const { data, error } = await supabase
    .from('products')
    .insert({ ...product, category_id: categoryId, user_id: user.id })
    .select(PRODUCT_SELECT)
    .single();
  if (error) throw error;

  if (variants?.length) {
    const { error: vErr } = await supabase.from('product_variants').insert(
      variants.map((v) => ({
        ...v,
        product_id: data.id,
        user_id: user.id,
      }))
    );
    if (vErr) throw vErr;
    await supabase.from('products').update({ has_variants: true }).eq('id', data.id);
    return getProduct(data.id);
  }
  return data;
}

export async function updateProduct(id, payload) {
  const { variants, category_name, ...product } = payload;
  const { data: { user } } = await supabase.auth.getUser();

  let categoryId = product.category_id || null;
  if (!categoryId && category_name?.trim()) {
    const { data: cat } = await supabase
      .from('categories')
      .upsert({ user_id: user.id, name: category_name.trim() }, { onConflict: 'user_id,name' })
      .select()
      .single();
    categoryId = cat?.id || null;
  }

  const { error } = await supabase
    .from('products')
    .update({ ...product, category_id: categoryId })
    .eq('id', id);
  if (error) throw error;

  if (Array.isArray(variants)) {
    await supabase.from('product_variants').delete().eq('product_id', id);
    if (variants.length) {
      const { error: vErr } = await supabase.from('product_variants').insert(
        variants.map((v) => ({ ...v, product_id: id, user_id: user.id }))
      );
      if (vErr) throw vErr;
    }
    await supabase.from('products').update({ has_variants: variants.length > 0 }).eq('id', id);
  }
  return getProduct(id);
}

export async function deleteProduct(id) {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

export async function setProductStatus(id, status) {
  const { error } = await supabase.from('products').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function listCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function createCategory(name) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('categories')
    .upsert({ user_id: user.id, name: name.trim() }, { onConflict: 'user_id,name' })
    .select()
    .single();
  if (error) throw error;
  return data;
}
