/// <reference types="astro/client" />

import type { SupabaseClient } from './db/supabase.client';

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient;
      /** Set from Supabase session in middleware. */
      userId?: string;
      /** Set from Supabase session in middleware (id + email). */
      user?: { id: string; email?: string };
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly OPENROUTER_API_KEY: string;
  readonly DEFAULT_USER_ID?: string;
  /** Service role key; used only by scripts/seed-default-user.mjs (never in app). */
  readonly SUPABASE_SERVICE_ROLE_KEY?: string;
  /** When "true" or "1", GET /generation-error-logs is restricted to administrators only (403 for non-admins). */
  readonly GENERATION_ERROR_LOGS_ADMIN_ONLY?: string;
  /** Comma-separated list of user IDs allowed as admins when GENERATION_ERROR_LOGS_ADMIN_ONLY is set. If unset, DEFAULT_USER_ID is treated as the only admin. */
  readonly ADMIN_USER_IDS?: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
