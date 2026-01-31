/**
 * POST /api/generations — initiates AI flashcard generation.
 * GET /api/generations — lists user's generations with pagination, sort, and filters.
 */
import type { APIRoute } from "astro";
import { z } from "zod";
import { DEFAULT_USER_ID } from "../../db/supabase.client";
import { json } from "../../lib/api-response";
import {
  createGeneration,
  listGenerations,
  type ListGenerationsOptions,
} from "../../lib/services/generation.service";

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

// ------------------------------------------------------------------------------------------------
// GET /generations — query parameters (pagination, sort, filters)
// ------------------------------------------------------------------------------------------------
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const SOURCE_TEXT_LENGTH_MIN = 1000;
const SOURCE_TEXT_LENGTH_MAX = 10000;

const generationsListSortEnum = z.enum([
  "created_at",
  "created_at_desc",
  "updated_at",
  "updated_at_desc",
  "model",
  "model_desc",
  "generation_duration",
  "generation_duration_desc",
]);

export const generationsListQuerySchema = z
  .object({
    page: z
      .union([z.string(), z.number(), z.undefined()])
      .transform((v) =>
        v === undefined || v === "" ? DEFAULT_PAGE : Number(v)
      )
      .pipe(z.number().int().min(1, "Page must be at least 1")),
    limit: z
      .union([z.string(), z.number(), z.undefined()])
      .transform((v) =>
        v === undefined || v === "" ? DEFAULT_LIMIT : Number(v)
      )
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
        (v) => generationsListSortEnum.safeParse(v).success,
        "Invalid sort value"
      )
      .transform((v) => v as z.infer<typeof generationsListSortEnum>),
    // Optional filters (empty string treated as absent)
    model: z
      .string()
      .optional()
      .transform((s) => (s === "" ? undefined : s)),
    created_after: z
      .string()
      .optional()
      .transform((s) => (s === "" ? undefined : s))
      .pipe(
        z.optional(
          z.string().datetime({
            offset: true,
            message: "created_after must be ISO 8601 datetime",
          })
        )
      ),
    created_before: z
      .string()
      .optional()
      .transform((s) => (s === "" ? undefined : s))
      .pipe(
        z.optional(
          z.string().datetime({
            offset: true,
            message: "created_before must be ISO 8601 datetime",
          })
        )
      ),
    source_text_length_min: z
      .union([z.string(), z.number(), z.undefined()])
      .transform((v) => (v === undefined || v === "" ? undefined : Number(v)))
      .pipe(
        z.optional(
          z
            .number()
            .int()
            .min(
              SOURCE_TEXT_LENGTH_MIN,
              `source_text_length_min must be between ${SOURCE_TEXT_LENGTH_MIN} and ${SOURCE_TEXT_LENGTH_MAX}`
            )
            .max(
              SOURCE_TEXT_LENGTH_MAX,
              `source_text_length_min must be between ${SOURCE_TEXT_LENGTH_MIN} and ${SOURCE_TEXT_LENGTH_MAX}`
            )
        )
      ),
    source_text_length_max: z
      .union([z.string(), z.number(), z.undefined()])
      .transform((v) => (v === undefined || v === "" ? undefined : Number(v)))
      .pipe(
        z.optional(
          z
            .number()
            .int()
            .min(
              SOURCE_TEXT_LENGTH_MIN,
              `source_text_length_max must be between ${SOURCE_TEXT_LENGTH_MIN} and ${SOURCE_TEXT_LENGTH_MAX}`
            )
            .max(
              SOURCE_TEXT_LENGTH_MAX,
              `source_text_length_max must be between ${SOURCE_TEXT_LENGTH_MIN} and ${SOURCE_TEXT_LENGTH_MAX}`
            )
        )
      ),
  })
  .superRefine((data, ctx) => {
    const min = data.source_text_length_min;
    const max = data.source_text_length_max;
    if (min !== undefined && max !== undefined && min > max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "source_text_length_min must be less than or equal to source_text_length_max",
        path: ["source_text_length_max"],
      });
    }
  });

export type GenerationsListQuery = z.infer<typeof generationsListQuerySchema>;

/**
 * Maps validated query (flat) to ListGenerationsOptions (with nested filter).
 */
function queryToOptions(parsed: GenerationsListQuery): ListGenerationsOptions {
  const filter =
    parsed.model != null ||
    parsed.created_after != null ||
    parsed.created_before != null ||
    parsed.source_text_length_min != null ||
    parsed.source_text_length_max != null
      ? {
          ...(parsed.model != null && { model: parsed.model }),
          ...(parsed.created_after != null && { created_after: parsed.created_after }),
          ...(parsed.created_before != null && { created_before: parsed.created_before }),
          ...(parsed.source_text_length_min != null && {
            source_text_length_min: parsed.source_text_length_min,
          }),
          ...(parsed.source_text_length_max != null && {
            source_text_length_max: parsed.source_text_length_max,
          }),
        }
      : undefined;

  return {
    page: parsed.page,
    limit: parsed.limit,
    sort: parsed.sort,
    filter,
  };
}

/**
 * GET /api/generations
 * Lists generations for the authenticated user. Query: page, limit, sort, optional filters.
 * Returns 200 with { data, pagination }; 400 on invalid params; 401 if unauthenticated; 500 on server error.
 */
export const GET: APIRoute = async (context) => {
  const { request, locals } = context;
  const supabase = locals.supabase;

  const url = new URL(request.url);
  const raw = Object.fromEntries(url.searchParams);

  const parsed = generationsListQuerySchema.safeParse(raw);
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

  const userId = DEFAULT_USER_ID;
  if (!userId) {
    return json(
      { error: "Unauthorized", message: "Authentication required" },
      401
    );
  }

  const options = queryToOptions(parsed.data);
  const result = await listGenerations(supabase, userId, options);

  if (result.success) {
    return json(result.data, 200);
  }

  return json(
    { error: "Internal Server Error", message: "Failed to list generations" },
    500
  );
};

export const POST: APIRoute = async (context) => {
  const { request, locals } = context;
  const supabase = locals.supabase;

  if (!supabase) {
    console.error("[POST /api/generations] supabase client missing on locals");
    return json(
      { error: "Internal Server Error", message: "Server configuration error" },
      500
    );
  }

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

  let result: Awaited<ReturnType<typeof createGeneration>>;
  try {
    result = await createGeneration(supabase, DEFAULT_USER_ID, parsed.data);
  } catch (err) {
    const rawMessage =
      err instanceof Error ? err.message : "Unexpected error during generation";
    const causeMessage =
      err instanceof Error && err.cause instanceof Error
        ? err.cause.message
        : null;
    console.error("[POST /api/generations]", err);
    if (causeMessage) {
      console.error("[POST /api/generations] cause:", causeMessage);
    }
    // Map generic "fetch failed" to a clearer message (OpenRouter/Supabase network or timeout)
    const message =
      rawMessage === "fetch failed" || rawMessage.includes("fetch failed")
        ? "Request to an external service failed (network, DNS, or timeout). Check OPENROUTER_API_KEY and connectivity; slow models may need more time."
        : rawMessage;
    return json(
      { error: "Internal Server Error", message },
      500
    );
  }

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

  // result.kind === "db_error"
  console.error("[POST /api/generations] DB error:", result.errorMessage);
  const message = result.errorMessage?.includes("fetch failed")
    ? "Database connection failed (Supabase unreachable). Check SUPABASE_URL and SUPABASE_KEY in .env and that the Supabase project is not paused."
    : (result.errorMessage ?? "Database error");
  return json(
    { error: "Internal Server Error", message },
    500
  );
};
