/**
 * POST /api/auth/logout — sign out and clear session cookies.
 * Returns 302 to /auth/login on success; 400 on error.
 */
import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client";
import { json } from "../../../lib/api-response";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = createSupabaseServerInstance({ cookies, headers: request.headers });
  const { error } = await supabase.auth.signOut();

  if (error) {
    return json({ error: error.message }, 400);
  }

  return new Response(null, {
    status: 302,
    headers: { Location: "/auth/login" },
  });
};
