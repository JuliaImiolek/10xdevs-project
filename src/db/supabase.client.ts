import { createClient } from '@supabase/supabase-js';

import type { Database } from './database.types';

// Support both Vite (import.meta.env) and Node server (process.env) so env vars are read in API routes
const supabaseUrl =
  import.meta.env?.SUPABASE_URL ??
  (typeof process !== "undefined" ? process.env?.SUPABASE_URL : undefined) ??
  "";
const supabaseAnonKey =
  import.meta.env?.SUPABASE_KEY ??
  (typeof process !== "undefined" ? process.env?.SUPABASE_KEY : undefined) ??
  "";

/**
 * User ID used until auth is implemented. Set DEFAULT_USER_ID in .env to override.
 */
export const DEFAULT_USER_ID =
  import.meta.env?.DEFAULT_USER_ID ??
  (typeof process !== "undefined" ? process.env?.DEFAULT_USER_ID : undefined) ??
  "43454c13-032d-4a61-8f7c-356fab613472";

export type SupabaseClient = typeof supabaseClient;
export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
