/**
 * POST /api/flashcards — creates one or more flashcards (bulk).
 * GET /api/flashcards — lists user's flashcards with pagination, sort, and optional filter.
 * Returns 201/200 on success; 400 on validation error; 401 if unauthenticated; 500 on server error.
 */
import type { APIRoute } from "astro";
import { z } from "zod";
import { json } from "../../lib/api-response";
import {
  createFlashcards,
  listFlashcards,
  listFlashcardsForSession,
  type ListFlashcardsOptions,
} from "../../lib/services/flashcard.service";

export const prerender = false;

/** Max number of flashcards per request (performance / abuse prevention). */
const FLASHCARDS_ARRAY_MAX_LENGTH = 100;

const sourceSchema = z.enum(["manual", "ai-full", "ai-edited"]);

const flashcardCreateItemSchema = z
  .object({
    front: z.string().min(1, "front is required").max(200, "front must be at most 200 characters"),
    back: z.string().min(1, "back is required").max(500, "back must be at most 500 characters"),
    source: sourceSchema,
    // Accept 0 and undefined as null (legacy / optional field)
    generation_id: z
      .preprocess(
        (val) => (val === 0 || val === undefined ? null : val),
        z.union([z.number().int().positive(), z.null()])
      ),
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
    }
    // For ai-full/ai-edited, null is allowed (e.g. when not linked to a generation)
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

// ------------------------------------------------------------------------------------------------
// GET /flashcards — query parameters (pagination, sort, optional filter)
// ------------------------------------------------------------------------------------------------
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const flashcardsListSortEnum = z.enum([
  "created_at",
  "created_at_desc",
  "updated_at",
  "updated_at_desc",
  "source",
  "source_desc",
]);

export const flashcardsListQuerySchema = z.object({
  page: z
    .union([z.string(), z.number(), z.undefined()])
    .transform((v) => (v === undefined || v === "" ? DEFAULT_PAGE : Number(v)))
    .pipe(z.number().int().min(1, "Page must be at least 1")),
  limit: z
    .union([z.string(), z.number(), z.undefined()])
    .transform((v) => (v === undefined || v === "" ? DEFAULT_LIMIT : Number(v)))
    .pipe(
      z
        .number()
        .int()
        .min(1, "Limit must be at least 1")
        .max(MAX_LIMIT, `Limit must be at most ${MAX_LIMIT}`)
    ),
  sort: z
    .string()
    .optional()
    .default("created_at_desc")
    .refine(
      (v) => flashcardsListSortEnum.safeParse(v).success,
      "Invalid sort value"
    )
    .transform((v) => v as z.infer<typeof flashcardsListSortEnum>),
  source: z
    .string()
    .optional()
    .transform((s) => (s === "" ? undefined : s))
    .pipe(z.optional(sourceSchema)),
  forSession: z
    .union([z.string(), z.boolean(), z.undefined()])
    .optional()
    .transform((v) => v === true || v === "true" || v === "1"),
});

export type FlashcardsListQuery = z.infer<typeof flashcardsListQuerySchema>;

/**
 * Maps validated GET /flashcards query params to ListFlashcardsOptions for the service.
 */
function queryToOptions(parsed: FlashcardsListQuery): ListFlashcardsOptions {
  const filter =
    parsed.source != null ? { source: parsed.source } : undefined;
  return {
    page: parsed.page,
    limit: parsed.limit,
    sort: parsed.sort,
    filter,
  };
}

export const POST: APIRoute = async (context) => {
  const { request, locals } = context;
  const supabase = locals.supabase;
  const userId = locals.userId;

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

/**
 * GET /api/flashcards
 * Lists flashcards for the authenticated user. Query: page, limit, sort, optional source filter.
 * Returns 200 with { data, pagination }; 400 on invalid params; 401 if unauthenticated; 500 on server error.
 */
export const GET: APIRoute = async (context) => {
  const { request, locals } = context;
  const supabase = locals.supabase;

  const url = new URL(request.url);
  const raw = Object.fromEntries(url.searchParams);

  const parsed = flashcardsListQuerySchema.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.flatten().fieldErrors;
    return json(
      {
        error: "Bad Request",
        message: "Invalid query parameters",
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

  if (parsed.data.forSession) {
    const limit = Math.min(parsed.data.limit, 100);
    const result = await listFlashcardsForSession(supabase, userId, limit);
    if (!result.success) {
      return json(
        { error: "Internal Server Error", message: result.errorMessage },
        500
      );
    }
    return json(
      {
        data: result.data,
        pagination: { page: 1, limit: result.data.length, total: result.data.length },
      },
      200
    );
  }

  const options = queryToOptions(parsed.data);
  const result = await listFlashcards(supabase, userId, options);

  if (result.success) {
    return json(result.data, 200);
  }

  return json(
    { error: "Internal Server Error", message: result.errorMessage },
    500
  );
};
