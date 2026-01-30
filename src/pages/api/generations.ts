/**
 * POST /api/generations
 * Initiates AI flashcard generation from source_text.
 * Returns 201 with generation_id, flashcards_proposals, generated_count;
 * 400 on validation error, 500 on server/DB error, 599 on AI error.
 */
import type { APIRoute } from "astro";
import { z } from "zod";
import { DEFAULT_USER_ID } from "../../db/supabase.client";
import { createGeneration } from "../../lib/services/generation.service";

export const prerender = false;

/** Min/max length for source_text (matches DB check: source_text_length between 1000 and 10000) */
export const SOURCE_TEXT_MIN_LENGTH = 1000;
export const SOURCE_TEXT_MAX_LENGTH = 10000;

export const generationRequestSchema = z.object({
  source_text: z
    .string()
    .min(1, "source_text is required")
    .min(
      SOURCE_TEXT_MIN_LENGTH,
      `source_text must be at least ${SOURCE_TEXT_MIN_LENGTH} characters`
    )
    .max(
      SOURCE_TEXT_MAX_LENGTH,
      `source_text must be at most ${SOURCE_TEXT_MAX_LENGTH} characters`
    ),
  metadata: z.record(z.unknown()).optional(),
});

export type GenerationRequestInput = z.infer<typeof generationRequestSchema>;

const json = (body: unknown, status: number, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });

export const POST: APIRoute = async (context) => {
  const { request, locals } = context;
  const supabase = locals.supabase;

  // Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(
      { error: "Bad Request", message: "Invalid JSON body" },
      400
    );
  }

  const parsed = generationRequestSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors;
    const message =
      first.source_text?.join(" ") ?? parsed.error.message;
    return json(
      { error: "Validation Error", message, details: first },
      400
    );
  }

  const result = await createGeneration(supabase, DEFAULT_USER_ID, parsed.data);

  if (result.success) {
    return json(result.data, 201);
  }

  if (result.kind === "ai_error") {
    return json(
      {
        error: "AI Service Error",
        message: result.errorMessage,
        code: result.errorCode,
      },
      599
    );
  }

  return json(
    { error: "Internal Server Error", message: result.errorMessage },
    500
  );
};
