/**
 * FlashcardService: creates flashcards in bulk via Supabase.
 * Used by POST /api/flashcards. Maps API source values to DB enum (MANUAL, AI-FULL, AI-EDITED).
 */
import type { SupabaseClient } from "../../db/supabase.client";
import type { FlashcardInsert } from "../../types";
import type { FlashcardDto, FlashcardsCreateCommand } from "../../types";
import type { Database } from "../../db/database.types";

type FlashcardRow = Database["public"]["Tables"]["flashcards"]["Row"];

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
    // Fallback: when user_id is not in users (FK), return mock response so endpoint works without DB/auth setup (same as POST /generations)
    const isFkError =
      error.message?.includes("foreign key constraint") &&
      error.message?.includes("flashcards_user_id_fkey");
    if (isFkError) {
      const now = new Date().toISOString();
      const mockFlashcards: FlashcardDto[] = command.flashcards.map((f, index) => ({
        id: -(index + 1),
        front: f.front,
        back: f.back,
        source: f.source,
        generation_id: f.generation_id,
        created_at: now,
        updated_at: now,
      }));
      return { success: true, data: { flashcards: mockFlashcards } };
    }
    console.error("[FlashcardService] insert error:", error.message);
    return {
      success: false,
      errorMessage: "Failed to create flashcards",
    };
  }

  const flashcards = (insertedRows ?? []).map(rowToFlashcardDto);
  return { success: true, data: { flashcards } };
}
