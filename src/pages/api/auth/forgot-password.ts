/**
 * POST /api/auth/forgot-password — wysyła link do resetu hasła na podany adres e-mail.
 * Zgodnie z dobrymi praktykami zwraca ten sam komunikat niezależnie od tego, czy konto istnieje.
 */
import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client";
import { json } from "../../../lib/api-response";
import { forgotPasswordBodySchema } from "../../../lib/validations/auth";

export const prerender = false;

function getRedirectTo(request: Request): string {
  const siteUrl = import.meta.env.SITE_URL ?? (typeof process !== "undefined" ? process.env?.SITE_URL : undefined);
  if (siteUrl && typeof siteUrl === "string") {
    return `${siteUrl.replace(/\/$/, "")}/auth/reset-password`;
  }
  try {
    const url = new URL(request.url);
    return `${url.origin}/auth/reset-password`;
  } catch {
    return "/auth/reset-password";
  }
}

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Nieprawidłowy format żądania." }, 400);
  }

  const parsed = forgotPasswordBodySchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const message = (first.email?.[0] as string) ?? "Błąd walidacji.";
    return json({ error: "Validation error", message }, 400);
  }

  const { email } = parsed.data;
  const supabase = createSupabaseServerInstance({ cookies, headers: request.headers });
  const redirectTo = getRedirectTo(request);

  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo,
  });

  if (error) {
    return json(
      {
        error: error.message,
        message: "Wystąpił błąd podczas wysyłania linku. Spróbuj ponownie później.",
      },
      400
    );
  }

  return json(
    {
      message:
        "Jeśli konto z podanym adresem e-mail istnieje, wysłaliśmy na niego link do resetu hasła. Sprawdź skrzynkę (w tym folder spam).",
    },
    200
  );
};
