/**
 * POST /api/auth/register — sign up with email and password.
 * On success returns 200 with message; Supabase may send a confirmation email.
 * On error returns JSON 400.
 */
import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client";
import { json } from "../../../lib/api-response";
import { registerBodySchema } from "../../../lib/validations/auth";

export const prerender = false;

const REGISTER_SUCCESS_MESSAGE =
  "Konto zostało utworzone. Na podany adres e-mail wysłaliśmy link do potwierdzenia konta — sprawdź skrzynkę (także folder „Oferty” lub „Spam”). Po potwierdzeniu możesz się zalogować.";

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Nieprawidłowy format żądania." }, 400);
  }

  const parsed = registerBodySchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const message =
      (first.email?.[0] as string) ?? (first.password?.[0] as string) ?? "Błąd walidacji.";
    return json({ error: "Validation error", message }, 400);
  }

  const { email, password } = parsed.data;
  const supabase = createSupabaseServerInstance({ cookies, headers: request.headers });

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  });

  if (error) {
    const message =
      error.message === "User already registered"
        ? "Ten adres e-mail jest już zarejestrowany. Zaloguj się lub użyj resetu hasła."
        : error.message;
    return json({ error: message, message }, 400);
  }

  if (!data.user) {
    return json({ error: "Rejestracja nie powiodła się." }, 400);
  }

  return json({ message: REGISTER_SUCCESS_MESSAGE }, 200);
};
