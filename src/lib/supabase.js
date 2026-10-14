import { createClient } from '@supabase/supabase-js';
import { demoClient } from './demoClient';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * True only when both env vars are present.
 * Without them the app runs in a clearly-labelled DEMO MODE
 * (in-memory sample data) so every screen can be explored.
 * With them, ALL data flows through real Supabase + RLS.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const isDemoMode = !isSupabaseConfigured;

/**
 * Single Supabase client (or the demo shim).
 * Auth: email/password with persistent sessions (localStorage).
 * Data access is protected by Row Level Security — the anon key is safe to ship.
 * NEVER use the service_role key in frontend code.
 */
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
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
    })
  : demoClient;
