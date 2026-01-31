/**
 * POST /api/auth/change-password — zmienia hasło zalogowanego użytkownika.
 * Wymaga poprawnego obecnego hasła. Zwraca 401, gdy użytkownik nie jest zalogowany.
 */
import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client";
import { json } from "../../../lib/api-response";
import { changePasswordBodySchema } from "../../../lib/validations/auth";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  const user = locals.user;
  if (!user?.id || !user?.email) {
    return json({ error: "Zaloguj się, aby zmienić hasło.", message: "Zaloguj się, aby zmienić hasło." }, 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Nieprawidłowy format żądania." }, 400);
  }

  const parsed = changePasswordBodySchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const message =
      (first.current_password?.[0] as string) ?? (first.new_password?.[0] as string) ?? "Błąd walidacji.";
    return json({ error: "Validation error", message }, 400);
  }

  const { current_password, new_password } = parsed.data;
  const supabase = createSupabaseServerInstance({ cookies, headers: request.headers });

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: current_password,
  });

  if (signInError) {
    const message =
      signInError.message === "Invalid login credentials"
        ? "Obecne hasło jest nieprawidłowe."
        : signInError.message;
    return json({ error: message, message: "Obecne hasło jest nieprawidłowe lub wystąpił błąd. Spróbuj ponownie." }, 400);
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: new_password });

  if (updateError) {
    return json(
      {
        error: updateError.message,
        message: "Nie udało się zmienić hasła. Spróbuj ponownie.",
      },
      400
    );
  }

  return json(
    {
      message: "Hasło zostało zmienione.",
    },
    200
  );
};
