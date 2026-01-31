/**
 * POST /api/auth/delete-account — usuwa konto zalogowanego użytkownika (wymaga potwierdzenia "USUŃ").
 * Wymaga SUPABASE_SERVICE_ROLE_KEY. Po usunięciu zwraca 302 na /auth/login z komunikatem.
 */
import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client";
import { createSupabaseAdminClient } from "../../../db/supabase.client";
import { json } from "../../../lib/api-response";
import { deleteAccountBodySchema } from "../../../lib/validations/auth";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  const userId = locals.userId;
  if (!userId) {
    return json(
      { error: "Zaloguj się, aby usunąć konto.", message: "Zaloguj się, aby usunąć konto." },
      401
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Nieprawidłowy format żądania." }, 400);
  }

  const parsed = deleteAccountBodySchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const message = (first.confirm?.[0] as string) ?? "Wpisz „USUŃ”, aby potwierdzić usunięcie konta.";
    return json({ error: "Validation error", message }, 400);
  }

  let adminClient;
  try {
    adminClient = createSupabaseAdminClient();
  } catch {
    return json(
      {
        error: "Konfiguracja serwera nie pozwala na usuwanie kont.",
        message: "Wystąpił błąd podczas usuwania konta. Skontaktuj się z administratorem.",
      },
      500
    );
  }

  const { error } = await adminClient.auth.admin.deleteUser(userId);

  if (error) {
    return json(
      {
        error: error.message,
        message: "Wystąpił błąd podczas usuwania konta. Spróbuj ponownie.",
      },
      400
    );
  }

  await createSupabaseServerInstance({ cookies, headers: request.headers }).auth.signOut();

  return new Response(null, {
    status: 302,
    headers: { Location: "/auth/login?message=" + encodeURIComponent("Konto zostało usunięte.") },
  });
};
