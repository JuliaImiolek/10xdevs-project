/**
 * GET /api/generation-error-logs — lists user's generation error log entries with pagination, sort, and optional filters.
 * Requires authentication. When GENERATION_ERROR_LOGS_ADMIN_ONLY=true, only users in ADMIN_USER_IDS (or DEFAULT_USER_ID if unset) may access; others receive 403.
 * Returns 200 with { data, pagination }; 400 on invalid query params; 401 if unauthenticated; 403 if admin-only and user is not admin; 500 on server error.
 */
import type { APIRoute } from "astro";
import { z } from "zod";
import { DEFAULT_USER_ID } from "../../db/supabase.client";
import { json } from "../../lib/api-response";
import {
  listGenerationErrorLogs,
  type ListGenerationErrorLogsOptions,
} from "../../lib/services/generation.service";

export const prerender = false;

// ------------------------------------------------------------------------------------------------
// GET /generation-error-logs — query parameters (pagination, sort, optional filters)
// ------------------------------------------------------------------------------------------------
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const generationErrorLogsListSortEnum = z.enum([
  "created_at",
  "created_at_desc",
  "model",
  "model_desc",
  "error_code",
  "error_code_desc",
]);

/**
 * Zod schema for GET /generation-error-logs query parameters.
 * Validates page, limit, sort, and optional filters (model, created_after, created_before).
 */
export const generationErrorLogsListQuerySchema = z
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
        (v) => generationErrorLogsListSortEnum.safeParse(v).success,
        "Invalid sort value"
      )
      .transform((v) => v as z.infer<typeof generationErrorLogsListSortEnum>),
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
  })
  .superRefine((data, ctx) => {
    const after = data.created_after;
    const before = data.created_before;
    if (after != null && before != null && after > before) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "created_after must be less than or equal to created_before",
        path: ["created_before"],
      });
    }
  });

export type GenerationErrorLogsListQuery = z.infer<
  typeof generationErrorLogsListQuerySchema
>;

/**
 * Maps validated query (flat) to ListGenerationErrorLogsOptions (with nested filter).
 */
function queryToOptions(
  parsed: GenerationErrorLogsListQuery
): ListGenerationErrorLogsOptions {
  const filter =
    parsed.model != null ||
    parsed.created_after != null ||
    parsed.created_before != null
      ? {
          ...(parsed.model != null && { model: parsed.model }),
          ...(parsed.created_after != null && {
            created_after: parsed.created_after,
          }),
          ...(parsed.created_before != null && {
            created_before: parsed.created_before,
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
 * GET /api/generation-error-logs
 * Lists generation error logs for the authenticated user. Query: page, limit, sort, optional filters.
 * Returns 200 with { data, pagination }; 400 on invalid params; 401 if unauthenticated; 403 if admin-only and user is not admin; 500 on server error.
 */
export const GET: APIRoute = async (context) => {
  const { request, locals } = context;
  const supabase = locals.supabase;

  const url = new URL(request.url);
  const raw = Object.fromEntries(url.searchParams);

  const parsed = generationErrorLogsListQuerySchema.safeParse(raw);
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

  // When endpoint is restricted to admins only, non-admin users receive 403.
  const adminOnly =
    import.meta.env.GENERATION_ERROR_LOGS_ADMIN_ONLY === "true" ||
    import.meta.env.GENERATION_ERROR_LOGS_ADMIN_ONLY === "1";
  if (adminOnly) {
    const adminIdsRaw = import.meta.env.ADMIN_USER_IDS ?? "";
    const adminIds = adminIdsRaw
      ? adminIdsRaw.split(",").map((id: string) => id.trim()).filter(Boolean)
      : [DEFAULT_USER_ID];
    if (!adminIds.includes(userId)) {
      return json(
        {
          error: "Forbidden",
          message: "Access restricted to administrators",
        },
        403
      );
    }
  }

  const options = queryToOptions(parsed.data);
  const result = await listGenerationErrorLogs(supabase, userId, options);

  if (result.success) {
    return json(result.data, 200);
  }

  console.error("[GET /api/generation-error-logs]", result.errorMessage);
  return json(
    {
      error: "Internal Server Error",
      message: "Failed to retrieve error logs",
    },
    500
  );
};
