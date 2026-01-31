/**
 * POST /api/auth/reset-password — ustawia nowe hasło na podstawie tokenu z linku e-mail (recovery).
 * Body: { token, new_password }. Token to access_token z fragmentu URL po przekierowaniu z Supabase.
 */
import type { APIRoute } from "astro";
import { json } from "../../../lib/api-response";
import { resetPasswordBodySchema } from "../../../lib/validations/auth";

export const prerender = false;

const supabaseUrl =
  import.meta.env?.SUPABASE_URL ?? (typeof process !== "undefined" ? process.env?.SUPABASE_URL : undefined) ?? "";
const supabaseAnonKey =
  import.meta.env?.SUPABASE_KEY ?? (typeof process !== "undefined" ? process.env?.SUPABASE_KEY : undefined) ?? "";

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Nieprawidłowy format żądania." }, 400);
  }

  const parsed = resetPasswordBodySchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const message =
      (first.token?.[0] as string) ?? (first.new_password?.[0] as string) ?? "Błąd walidacji.";
    return json({ error: "Validation error", message }, 400);
  }

  const { token, new_password } = parsed.data;

  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify({ password: new_password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message =
      err?.msg ?? err?.error_description ?? "Link do resetu wygasł lub jest nieprawidłowy. Poproś o nowy link.";
    return json({ error: message, message }, 400);
  }

  return json(
    {
      message: "Hasło zostało zmienione. Możesz się zalogować.",
    },
    200
  );
};
