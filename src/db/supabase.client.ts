import type { AstroCookies } from "astro";
import {
  createServerClient,
  type CookieOptionsWithName,
  type CookieOptions,
} from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

type CookieToSet = { name: string; value: string; options: CookieOptions };

const supabaseUrl =
  import.meta.env?.SUPABASE_URL ??
  (typeof process !== "undefined" ? process.env?.SUPABASE_URL : undefined) ??
  "";
const supabaseAnonKey =
  import.meta.env?.SUPABASE_KEY ??
  (typeof process !== "undefined" ? process.env?.SUPABASE_KEY : undefined) ??
  "";

export const cookieOptions: CookieOptionsWithName = {
  path: "/",
  secure: true,
  httpOnly: true,
  sameSite: "lax",
};

function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

export function createSupabaseServerInstance(context: {
  headers: Headers;
  cookies: AstroCookies;
}) {
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookieOptions,
    cookies: {
      getAll() {
        return parseCookieHeader(context.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value, options }) =>
          context.cookies.set(name, value, options),
        );
      },
    },
  });
}

export type SupabaseClient = ReturnType<typeof createSupabaseServerInstance>;

/**
 * Legacy singleton for server contexts that don't have request cookies (e.g. scripts).
 * Prefer createSupabaseServerInstance in middleware and API routes.
 */
export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

/**
 * User ID used by scripts (e.g. seed) when no session exists. Not used by app middleware.
 */
export const DEFAULT_USER_ID =
  import.meta.env?.DEFAULT_USER_ID ??
  (typeof process !== "undefined" ? process.env?.DEFAULT_USER_ID : undefined) ??
  "43454c13-032d-4a61-8f7c-356fab613472";
