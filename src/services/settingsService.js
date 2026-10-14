import { supabase } from '../lib/supabase';

/** Shop settings (one row per owner) + profile helpers */

export async function fetchShopSettings() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('shop_settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateShopSettings(patch) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('shop_settings')
    .upsert({ ...patch, user_id: user.id }, { onConflict: 'user_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProfile(patch) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', user.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Upload logo / product image to the shop-assets bucket under the user's folder. */
export async function uploadShopAsset(file, folder = 'logo') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const path = `${user.id}/${folder}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('shop-assets').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('shop-assets').getPublicUrl(path);
  return { path, url: data.publicUrl };
}
