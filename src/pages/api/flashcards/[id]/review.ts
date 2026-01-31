/**
 * POST /api/flashcards/[id]/review — records an SRS review (SM-2) for a flashcard.
 * Body: { grade: 1 | 2 | 3 } (1 = Źle, 2 = Średnio, 3 = Dobrze).
 * Returns 200 on success; 400 invalid id/body; 401 unauthenticated; 404 not found; 500 on server error.
 */
import type { APIRoute } from "astro";
import { z } from "zod";
import { json } from "../../../../lib/api-response";
import { recordReview } from "../../../../lib/services/flashcard.service";

export const prerender = false;

const flashcardIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int("Flashcard id must be an integer")
    .positive("Flashcard id must be a positive number"),
});

const reviewBodySchema = z.object({
  grade: z
    .number()
    .int("Grade must be 1, 2, or 3")
    .min(1, "Grade must be 1, 2, or 3")
    .max(3, "Grade must be 1, 2, or 3"),
});

export const POST: APIRoute = async (context) => {
  const { params, request, locals } = context;

  const parsedParams = flashcardIdParamSchema.safeParse(params);
  if (!parsedParams.success) {
    return json(
      { error: "Bad Request", message: "Invalid flashcard id" },
      400
    );
  }

  const userId = locals.userId;
  if (!userId) {
    return json(
      { error: "Unauthorized", message: "Authentication required" },
      401
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(
      { error: "Bad Request", message: "Invalid JSON body" },
      400
    );
  }

  const parsedBody = reviewBodySchema.safeParse(body);
  if (!parsedBody.success) {
    const message = parsedBody.error.errors.map((e) => e.message).join("; ") || "Invalid grade";
    return json({ error: "Validation Error", message }, 400);
  }

  const grade = parsedBody.data.grade as 1 | 2 | 3;
  const supabase = locals.supabase;
  const result = await recordReview(supabase, userId, parsedParams.data.id, grade);

  if (!result.success) {
    return json(
      { error: "Internal Server Error", message: result.errorMessage },
      500
    );
  }

  if (result.notFound) {
    return json(
      { error: "Not Found", message: "Flashcard not found" },
      404
    );
  }

  return json({ ok: true }, 200);
};
