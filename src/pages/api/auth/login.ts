/**
 * POST /api/auth/login — sign in with email and password.
 * On success returns 302 to /generate or whitelisted redirectTo. On error returns JSON 400/401.
 */
import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client";
import { json } from "../../../lib/api-response";
import { loginBodySchema } from "../../../lib/validations/auth";

export const prerender = false;

const ALLOWED_REDIRECT_PATHS = ["/", "/generate", "/flashcards", "/session", "/account"];

function getAllowedRedirect(redirectTo: string | undefined): string {
  if (!redirectTo || typeof redirectTo !== "string") return "/generate";
  const path = redirectTo.startsWith("/") ? redirectTo : `/${redirectTo}`;
  const normalized = path === "" ? "/" : path;
  return ALLOWED_REDIRECT_PATHS.includes(normalized) ? normalized : "/generate";
}

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Nieprawidłowy format żądania." }, 400);
  }

  const parsed = loginBodySchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const message =
      (first.email?.[0] as string) ?? (first.password?.[0] as string) ?? "Błąd walidacji.";
    return json({ error: "Validation error", message }, 400);
  }

  const { email, password, redirectTo } = parsed.data;
  const supabase = createSupabaseServerInstance({ cookies, headers: request.headers });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    const message =
      error.message === "Invalid login credentials"
        ? "Nieprawidłowy adres e-mail lub hasło."
        : error.message;
    return json({ error: message }, 401);
  }

  if (!data.user) {
    return json({ error: "Logowanie nie powiodło się." }, 401);
  }

  const redirectUrl = getAllowedRedirect(redirectTo);
  return new Response(null, {
    status: 302,
    headers: { Location: redirectUrl },
  });
};
