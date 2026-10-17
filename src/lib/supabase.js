import { createClient } from '@supabase/supabase-js';
import { demoClient } from './demoClient';

// Clean and normalize environment variables
const cleanEnv = (val) => {
  if (!val || typeof val !== 'string') return '';
  return val.trim().replace(/^["']|["']$/g, '');
};

const rawUrl = cleanEnv(import.meta.env.VITE_SUPABASE_URL);
const rawKey = cleanEnv(import.meta.env.VITE_SUPABASE_ANON_KEY);

function normalizeSupabaseUrl(url) {
  if (!url) return '';
  let clean = url.trim().replace(/^["']|["']$/g, '');
  if (clean && !clean.includes('.')) {
    // User passed just the project ref id (e.g. "qbsgxlnsjzgzklointrn")
    clean = `https://${clean}.supabase.co`;
  } else if (clean && !/^https?:\/\//i.test(clean)) {
    clean = `https://${clean}`;
  }
  return clean.replace(/\/+$/, '');
}

function isValidHttpUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const normalizedUrl = normalizeSupabaseUrl(rawUrl);
const isPlaceholder = !normalizedUrl || normalizedUrl.includes('your-project-ref.supabase.co') || rawKey.includes('your-anon-public-key');

let client = demoClient;
let configured = false;

if (normalizedUrl && rawKey && !isPlaceholder && isValidHttpUrl(normalizedUrl)) {
  try {
    client = createClient(normalizedUrl, rawKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'shop-manager-auth',
      },
      global: {
        headers: { 'x-application-name': 'shop-manager' },
      },
      realtime: { params: { eventsPerSecond: 2 } },
    });
    configured = true;
  } catch (err) {
    console.error('Supabase initialization failed, falling back to Demo Mode:', err);
    client = demoClient;
    configured = false;
  }
}

/**
 * True only when valid Supabase URL and Key are successfully configured.
 * Without them the app runs in DEMO MODE so the app never shows a blank screen.
 */
export const isSupabaseConfigured = configured;
export const isDemoMode = !configured;
export const supabase = client;
