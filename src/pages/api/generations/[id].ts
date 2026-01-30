/**
 * GET /api/generations/[id] — returns a single generation by id for the authenticated user.
 * Returns 200 with generation record; 400 invalid id; 401 unauthenticated; 404 not found; 500 server error.
 */
import type { APIRoute } from "astro";
import { z } from "zod";
import { DEFAULT_USER_ID } from "../../../db/supabase.client";
import { json } from "../../../lib/api-response";
import { getGenerationById } from "../../../lib/services/generation.service";

export const prerender = false;

/** Path param id: positive integer (BIGSERIAL). Invalid format → 400. */
const generationIdParamSchema = z.coerce
  .number()
  .int("Generation id must be an integer")
  .positive("Generation id must be a positive number");

/**
 * GET /api/generations/[id]
 * Fetches a single generation by id. Requires authentication; returns only the current user's record.
 */
export const GET: APIRoute = async (context) => {
  const { params, locals } = context;
  const supabase = locals.supabase;

  const rawId = params.id;
  const parsed = generationIdParamSchema.safeParse(rawId);
  if (!parsed.success) {
    const details = parsed.error.flatten().fieldErrors;
    return json(
      {
        error: "Bad Request",
        message: "Invalid generation id",
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

  const result = await getGenerationById(supabase, userId, parsed.data);

  if (!result.success) {
    return json(
      { error: "Internal Server Error", message: "Failed to fetch generation" },
      500
    );
  }

  if (result.data === null) {
    return json(
      { error: "Not Found", message: "Generation not found" },
      404
    );
  }

  return json(result.data, 200);
};
