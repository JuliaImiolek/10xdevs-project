/**
 * FlashcardService: creates flashcards in bulk via Supabase; lists and fetches by id for GET /api/flashcards.
 * Maps API source values to DB enum (MANUAL, AI-FULL, AI-EDITED).
 */
import type { SupabaseClient } from "../../db/supabase.client";
import type { FlashcardInsert } from "../../types";
import type {
  FlashcardDto,
  FlashcardsCreateCommand,
  FlashcardsListResponseDto,
} from "../../types";
import type { Database } from "../../db/database.types";

type FlashcardRow = Database["public"]["Tables"]["flashcards"]["Row"];

// ------------------------------------------------------------------------------------------------
// List & get by id — types and sort mapping (GET /flashcards, GET /flashcards/{id})
// ------------------------------------------------------------------------------------------------

/** Allowed sort values for GET /flashcards (column + direction). */
export type ListFlashcardsSort =
  | "created_at"
  | "created_at_desc"
  | "updated_at"
  | "updated_at_desc"
  | "source"
  | "source_desc";

/** Optional filter for listing flashcards (e.g. by source). */
export interface ListFlashcardsFilter {
  source?: "manual" | "ai-full" | "ai-edited";
}

/** Options for listFlashcards: pagination, sort, optional filter. */
export interface ListFlashcardsOptions {
  page: number;
  limit: number;
  sort: ListFlashcardsSort;
  filter?: ListFlashcardsFilter;
}

/** Result of listFlashcards: success with data + pagination or server error. */
export type ListFlashcardsResult =
  | { success: true; data: FlashcardsListResponseDto }
  | { success: false; errorMessage: string };

/** Result of getFlashcardById: single flashcard or null (not found), or server error. */
export type GetFlashcardByIdResult =
  | { success: true; data: FlashcardDto }
  | { success: true; data: null }
  | { success: false; errorMessage: string };

/** Payload for PUT /flashcards/{id}: only front, back, and source (ai-edited | manual). */
export type UpdateFlashcardPayload = {
  front?: string;
  back?: string;
  source?: "ai-edited" | "manual";
};

/** Result of updateFlashcard: updated flashcard DTO, null (not found), or server error. */
export type UpdateFlashcardResult =
  | { success: true; data: FlashcardDto }
  | { success: true; data: null }
  | { success: false; errorMessage: string };

/** Result of deleteFlashcard: success, not found, or server error. */
export type DeleteFlashcardResult =
  | { success: true; notFound?: false }
  | { success: true; notFound: true }
  | { success: false; errorMessage: string };

/** DB expects source in uppercase (MANUAL, AI-FULL, AI-EDITED) per db-plan. */
const SOURCE_TO_DB: Record<"manual" | "ai-full" | "ai-edited", string> = {
  manual: "MANUAL",
  "ai-full": "AI-FULL",
  "ai-edited": "AI-EDITED",
};

/** Map DB source back to API format (lowercase) for FlashcardDto. */
function dbSourceToApi(dbSource: string): "manual" | "ai-full" | "ai-edited" {
  const lower = dbSource?.toLowerCase();
  if (lower === "manual" || lower === "ai-full" || lower === "ai-edited") {
    return lower;
  }
  return "manual";
}

/**
 * Maps a flashcard row from Supabase to FlashcardDto (API response format).
 * Ensures source is returned in lowercase for API consistency.
 */
function rowToFlashcardDto(row: FlashcardRow): FlashcardDto {
  return {
    id: row.id,
    front: row.front,
    back: row.back,
    source: dbSourceToApi(row.source),
    generation_id: row.generation_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Maps API sort value to Supabase column and direction for flashcards table.
 * Used by listFlashcards for .order(column, { ascending }).
 */
function mapSortToOrder(
  sort: ListFlashcardsSort
): { column: keyof FlashcardRow; ascending: boolean } {
  const map: Record<
    ListFlashcardsSort,
    { column: keyof FlashcardRow; ascending: boolean }
  > = {
    created_at: { column: "created_at", ascending: true },
    created_at_desc: { column: "created_at", ascending: false },
    updated_at: { column: "updated_at", ascending: true },
    updated_at_desc: { column: "updated_at", ascending: false },
    source: { column: "source", ascending: true },
    source_desc: { column: "source", ascending: false },
  };
  return map[sort];
}

export type CreateFlashcardsResult =
  | { success: true; data: { flashcards: FlashcardDto[] } }
  | { success: false; errorMessage: string };

/**
 * Creates one or more flashcards for the given user.
 * Performs a single bulk insert and returns inserted rows as FlashcardDto[].
 *
 * @param supabase - Supabase client (from context.locals)
 * @param userId - Current user ID (DEFAULT_USER_ID until auth is implemented)
 * @param command - Validated command with array of flashcards to create
 * @returns Success with flashcards array, or failure with error message
 */
export async function createFlashcards(
  supabase: SupabaseClient,
  userId: string,
  command: FlashcardsCreateCommand
): Promise<CreateFlashcardsResult> {
  const rows: FlashcardInsert[] = command.flashcards.map((f) => ({
    front: f.front,
    back: f.back,
    source: SOURCE_TO_DB[f.source],
    generation_id: f.generation_id,
    user_id: userId,
  }));

  const { data: insertedRows, error } = await supabase
    .from("flashcards")
    .insert(rows)
    .select();

  if (error) {
    console.error("[FlashcardService] insert error:", error.message);
    return {
      success: false,
      errorMessage: "Failed to create flashcards",
    };
  }

  const flashcards = (insertedRows ?? []).map(rowToFlashcardDto);
  return { success: true, data: { flashcards } };
}

/**
 * Lists flashcards for the given user with pagination, optional sort and filter.
 * Uses count: 'exact' for total; maps rows via rowToFlashcardDto.
 *
 * @param supabase - Supabase client (from context.locals)
 * @param userId - Current user ID (DEFAULT_USER_ID until auth is implemented)
 * @param options - Pagination (page, limit), sort, optional filter (e.g. source)
 * @returns Success with { data, pagination } or failure with errorMessage
 */
export async function listFlashcards(
  supabase: SupabaseClient,
  userId: string,
  options: ListFlashcardsOptions
): Promise<ListFlashcardsResult> {
  const { page, limit, sort, filter } = options;
  const from = (page - 1) * limit;
  const to = page * limit - 1;
  const { column, ascending } = mapSortToOrder(sort);

  let query = supabase
    .from("flashcards")
    .select("*", { count: "exact", head: false })
    .eq("user_id", userId);

  if (filter?.source) {
    query = query.eq("source", SOURCE_TO_DB[filter.source]);
  }

  query = query.order(column, { ascending }).range(from, to);

  const { data: rows, error, count } = await query;

  if (error) {
    console.error("[FlashcardService] listFlashcards error:", error.message);
    return {
      success: false,
      errorMessage: "Failed to list flashcards",
    };
  }

  const total = count ?? 0;
  const data = (rows ?? []).map(rowToFlashcardDto);
  return {
    success: true,
    data: { data, pagination: { page, limit, total } },
  };
}

/**
 * Fetches a single flashcard by id for the given user.
 * Returns null when not found or when the flashcard belongs to another user (404 from handler).
 *
 * @param supabase - Supabase client (from context.locals)
 * @param userId - Current user ID
 * @param id - Flashcard id (BIGSERIAL, positive integer)
 * @returns Success with FlashcardDto or null; or failure with errorMessage
 */
export async function getFlashcardById(
  supabase: SupabaseClient,
  userId: string,
  id: number
): Promise<GetFlashcardByIdResult> {
  const { data: row, error } = await supabase
    .from("flashcards")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[FlashcardService] getFlashcardById error:", error.message);
    return {
      success: false,
      errorMessage: "Failed to fetch flashcard",
    };
  }

  if (row === null) {
    return { success: true, data: null };
  }

  return { success: true, data: rowToFlashcardDto(row) };
}

/**
 * Builds the DB update object from UpdateFlashcardPayload.
 * Only includes provided fields; maps source to DB enum (MANUAL, AI-EDITED).
 * Does not allow updating user_id, id, or created_at.
 */
function buildUpdatePayload(payload: UpdateFlashcardPayload): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (payload.front !== undefined) out.front = payload.front;
  if (payload.back !== undefined) out.back = payload.back;
  if (payload.source !== undefined) out.source = SOURCE_TO_DB[payload.source];
  return out;
}

/**
 * Updates a single flashcard by id for the given user.
 * Only provided fields (front, back, source) are updated; source is restricted to ai-edited | manual.
 *
 * @param supabase - Supabase client (from context.locals)
 * @param userId - Current user ID
 * @param id - Flashcard id (BIGSERIAL, positive integer)
 * @param payload - Validated payload with at least one of front, back, source
 * @returns Success with FlashcardDto or null (not found); or failure with errorMessage
 */
export async function updateFlashcard(
  supabase: SupabaseClient,
  userId: string,
  id: number,
  payload: UpdateFlashcardPayload
): Promise<UpdateFlashcardResult> {
  const updateBody = buildUpdatePayload(payload);
  if (Object.keys(updateBody).length === 0) {
    return { success: false, errorMessage: "At least one of front, back, or source is required" };
  }

  const { data: row, error } = await supabase
    .from("flashcards")
    .update(updateBody)
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return { success: true, data: null };
    }
    console.error("[FlashcardService] updateFlashcard error:", error.message);
    return {
      success: false,
      errorMessage: "Failed to update flashcard",
    };
  }

  if (row === null) {
    return { success: true, data: null };
  }

  return { success: true, data: rowToFlashcardDto(row) };
}

/**
 * Deletes a single flashcard by id for the given user.
 * Uses .select('id') to get deleted rows; 0 rows means not found or not owned by user.
 *
 * @param supabase - Supabase client (from context.locals)
 * @param userId - Current user ID
 * @param id - Flashcard id (BIGSERIAL, positive integer)
 * @returns Success; success with notFound: true; or failure with errorMessage
 */
export async function deleteFlashcard(
  supabase: SupabaseClient,
  userId: string,
  id: number
): Promise<DeleteFlashcardResult> {
  const { data: deletedRows, error } = await supabase
    .from("flashcards")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");

  if (error) {
    console.error("[FlashcardService] deleteFlashcard error:", error.message);
    return {
      success: false,
      errorMessage: "Failed to delete flashcard",
    };
  }

  const count = deletedRows?.length ?? 0;
  if (count === 0) {
    return { success: true, notFound: true };
  }

  return { success: true };
}
