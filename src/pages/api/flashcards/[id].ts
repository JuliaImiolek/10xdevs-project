/**
 * GET /api/flashcards/[id] — fetches a single flashcard by id.
 * PUT /api/flashcards/[id] — updates an existing flashcard by id.
 * DELETE /api/flashcards/[id] — deletes a flashcard by id.
 * All require authentication; user can only read/update/delete their own flashcards.
 * GET: 200 + FlashcardDto; 400 invalid id; 401 unauthenticated; 404 not found; 500 server error.
 * PUT/DELETE: 200 on success; 400 invalid id/body; 401 unauthenticated; 404 not found; 500 server error.
 */
import type { APIRoute } from "astro";
import { z } from "zod";
import { json } from "../../../lib/api-response";
import {
  getFlashcardById,
  updateFlashcard,
  deleteFlashcard,
} from "../../../lib/services/flashcard.service";

export const prerender = false;

/** Path param id: positive integer (BIGSERIAL). Invalid format → 400. */
const flashcardIdParamSchema = z.object({
  id: z.coerce
    .number()
    .int("Flashcard id must be an integer")
    .positive("Flashcard id must be a positive number"),
});

/** PUT body: at least one of front, back, or source; source only "ai-edited" | "manual". */
const flashcardPutBodySchema = z
  .object({
    front: z
      .string()
      .min(1, "front must be at least 1 character")
      .max(200, "front must be at most 200 characters")
      .optional(),
    back: z
      .string()
      .min(1, "back must be at least 1 character")
      .max(500, "back must be at most 500 characters")
      .optional(),
    source: z.enum(["ai-edited", "manual"], {
      errorMap: () => ({ message: "source must be ai-edited or manual" }),
    }).optional(),
  })
  .refine(
    (data) =>
      data.front !== undefined || data.back !== undefined || data.source !== undefined,
    { message: "At least one of front, back, or source is required" }
  );

export type FlashcardPutRequestBody = z.infer<typeof flashcardPutBodySchema>;

/**
 * GET /api/flashcards/[id]
 * Returns a single flashcard by id. Path param `id` must be a positive integer.
 * Returns 200 with FlashcardDto; 400 invalid id; 401 unauthenticated; 404 not found; 500 on server error.
 */
export const GET: APIRoute = async (context) => {
  const { params, locals } = context;

  const parsedParams = flashcardIdParamSchema.safeParse(params);
  if (!parsedParams.success) {
    const details = parsedParams.error.flatten().fieldErrors;
    return json(
      {
        error: "Bad Request",
        message: "Invalid flashcard id",
        details,
      },
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

  const supabase = locals.supabase;
  const result = await getFlashcardById(supabase, userId, parsedParams.data.id);

  if (!result.success) {
    return json(
      { error: "Internal Server Error", message: result.errorMessage },
      500
    );
  }

  if (result.data === null) {
    return json(
      { error: "Not Found", message: "Flashcard not found" },
      404
    );
  }

  return json(result.data, 200);
};

/**
 * PUT /api/flashcards/[id]
 * Updates an existing flashcard. Body must contain at least one of front, back, source.
 */
export const PUT: APIRoute = async (context) => {
  const { params, request, locals } = context;
  const supabase = locals.supabase;

  const parsedParams = flashcardIdParamSchema.safeParse(params);
  if (!parsedParams.success) {
    const details = parsedParams.error.flatten().fieldErrors;
    return json(
      {
        error: "Bad Request",
        message: "Invalid flashcard id",
        details,
      },
      400
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

  const parsedBody = flashcardPutBodySchema.safeParse(body);
  if (!parsedBody.success) {
    const flattened = parsedBody.error.flatten();
    const message = parsedBody.error.errors.map((e) => e.message).join("; ") || "Validation failed";
    return json(
      {
        error: "Validation Error",
        message,
        details: flattened.fieldErrors,
      },
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

  const payload = {
    front: parsedBody.data.front,
    back: parsedBody.data.back,
    source: parsedBody.data.source,
  };

  const result = await updateFlashcard(supabase, userId, parsedParams.data.id, payload);

  if (!result.success) {
    return json(
      { error: "Internal Server Error", message: result.errorMessage },
      500
    );
  }

  if (result.data === null) {
    return json(
      { error: "Not Found", message: "Flashcard not found" },
      404
    );
  }

  return json(result.data, 200);
};

/**
 * DELETE /api/flashcards/[id]
 * Deletes a flashcard by id. Returns 200 with confirmation message.
 */
export const DELETE: APIRoute = async (context) => {
  const { params, locals } = context;
  const supabase = locals.supabase;

  const parsedParams = flashcardIdParamSchema.safeParse(params);
  if (!parsedParams.success) {
    const details = parsedParams.error.flatten().fieldErrors;
    return json(
      {
        error: "Bad Request",
        message: "Invalid flashcard id",
        details,
      },
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

  const result = await deleteFlashcard(supabase, userId, parsedParams.data.id);

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

  return json({ message: "Flashcard deleted" }, 200);
};
