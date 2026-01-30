import { createClient } from '@supabase/supabase-js';

import type { Database } from './database.types';

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

/**
 * User ID used until auth is implemented. Set DEFAULT_USER_ID in .env to override.
 */
export const DEFAULT_USER_ID =
  import.meta.env.DEFAULT_USER_ID ?? "43454c13-032d-4a61-8f7c-356fab613472";

export type SupabaseClient = typeof supabaseClient;
export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
