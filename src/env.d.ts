/// <reference types="astro/client" />

import type { SupabaseClient } from './db/supabase.client';

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient;
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
  /** When "true", skip DB writes for generations; returns mock response (no auth/user needed). */
  readonly MOCK_GENERATIONS?: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
