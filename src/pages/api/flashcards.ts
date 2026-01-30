/**
 * POST /api/flashcards
 * Creates one or more flashcards (bulk). Supports manual and AI-sourced cards.
 * Returns 201 with created flashcards; 400 on validation error; 401 if unauthenticated; 500 on server error.
 */
import type { APIRoute } from "astro";
import { z } from "zod";
import { DEFAULT_USER_ID } from "../../db/supabase.client";
import { createFlashcards } from "../../lib/services/flashcard.service";

export const prerender = false;

/** Max number of flashcards per request (performance / abuse prevention). */
const FLASHCARDS_ARRAY_MAX_LENGTH = 100;

const sourceSchema = z.enum(["manual", "ai-full", "ai-edited"]);

const flashcardCreateItemSchema = z
  .object({
    front: z.string().min(1, "front is required").max(200, "front must be at most 200 characters"),
    back: z.string().min(1, "back is required").max(500, "back must be at most 500 characters"),
    source: sourceSchema,
    generation_id: z.number().int().positive().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.source === "manual") {
      if (data.generation_id !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "generation_id must be null when source is manual",
          path: ["generation_id"],
        });
      }
    } else {
      if (data.generation_id === null || data.generation_id === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "generation_id is required when source is ai-full or ai-edited",
          path: ["generation_id"],
        });
      }
    }
  });

export const flashcardsCreateRequestSchema = z.object({
  flashcards: z
    .array(flashcardCreateItemSchema)
    .min(1, "flashcards array must contain at least one item")
    .max(
      FLASHCARDS_ARRAY_MAX_LENGTH,
      `flashcards array must contain at most ${FLASHCARDS_ARRAY_MAX_LENGTH} items`
    ),
});

export type FlashcardsCreateRequest = z.infer<typeof flashcardsCreateRequestSchema>;

function json(body: unknown, status: number, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
}

export const POST: APIRoute = async (context) => {
  const { request, locals } = context;
  const supabase = locals.supabase;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(
      { error: "Bad Request", message: "Invalid JSON body" },
      400
    );
  }

  const parsed = flashcardsCreateRequestSchema.safeParse(body);
  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    const message = parsed.error.errors.map((e) => e.message).join("; ") || "Validation failed";
    return json(
      {
        error: "Validation Error",
        message,
        details: flattened.fieldErrors,
      },
      400
    );
  }

  const userId = DEFAULT_USER_ID;
  if (!userId) {
    return json(
      { error: "Unauthorized", message: "Authentication required" },
      401
    );
  }

  const result = await createFlashcards(supabase, userId, parsed.data);

  if (result.success) {
    return json({ flashcards: result.data.flashcards }, 201);
  }

  return json(
    { error: "Internal Server Error", message: result.errorMessage },
    500
  );
};
