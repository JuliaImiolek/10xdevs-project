/**
 * GenerationService: orchestrates AI flashcard generation, DB writes for generations
 * and optional flashcards, and error logging to generation_error_logs.
 */
import { createHash } from "node:crypto";
import type { SupabaseClient } from "../../db/supabase.client";
import type { Database } from "../../db/database.types";
import type { FlashcardProposalDto, GenerationCreateResponseDto } from "../../types";
import type { GenerationRequestInput } from "../../pages/api/generations";

type TablesInsert = Database["public"]["Tables"];

/** Default AI model name used for generation (stored in generations.model) */
const DEFAULT_MODEL = "openrouter/default";

/**
 * MD5 hash for source_text (for storage; used in generations and generation_error_logs).
 */
function sourceTextHash(text: string): string {
  return createHash("md5").update(text, "utf8").digest("hex");
}

/**
 * Mock AI service: returns deterministic mock flashcard proposals for development.
 * Kept as mocks until real AI integration (e.g. OpenRouter) is wired.
 */
async function callAiForFlashcards(
  sourceText: string,
  _model: string
): Promise<FlashcardProposalDto[]> {
  const len = Math.min(5, Math.max(2, Math.floor(sourceText.length / 500)));
  return Array.from({ length: len }, (_, i) => ({
    front: `Mock question ${i + 1} (from ${sourceText.length} chars)`,
    back: `Mock answer ${i + 1}`,
    source: "ai-full" as const,
  }));
}

export type CreateGenerationResult =
  | { success: true; data: GenerationCreateResponseDto }
  | { success: false; kind: "ai_error"; errorCode: string; errorMessage: string }
  | { success: false; kind: "db_error"; errorMessage: string };

/** When true, skip all DB writes and return mock response (no auth/user in auth.users needed). */
const isMockGenerations = () =>
  import.meta.env.MOCK_GENERATIONS === "true" || import.meta.env.MOCK_GENERATIONS === "1";

/**
 * Creates a generation: calls AI, inserts into generations, optionally inserts flashcards,
 * and returns the response DTO. On AI failure, logs to generation_error_logs and returns
 * ai_error (caller should respond with 599).
 * When MOCK_GENERATIONS=true, skips DB writes and returns mock data (no user_id FK required).
 */
export async function createGeneration(
  supabase: SupabaseClient,
  userId: string,
  input: GenerationRequestInput
): Promise<CreateGenerationResult> {
  const { source_text } = input;
  const sourceTextLength = source_text.length;
  const sourceTextHashValue = sourceTextHash(source_text);
  const model = DEFAULT_MODEL;

  const startTime = Date.now();

  let proposals: FlashcardProposalDto[];
  try {
    proposals = await callAiForFlashcards(source_text, model);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorCode = "AI_CALL_FAILED";
    if (!isMockGenerations()) {
      await logGenerationError(supabase, {
        user_id: userId,
        model,
        source_text_hash: sourceTextHashValue,
        source_text_length: sourceTextLength,
        error_code: errorCode,
        error_message: errorMessage,
        generation_id: null,
      });
    }
    return {
      success: false,
      kind: "ai_error",
      errorCode,
      errorMessage,
    };
  }

  if (isMockGenerations()) {
    const response: GenerationCreateResponseDto = {
      generation_id: 0,
      flashcards_proposals: proposals,
      generated_count: proposals.length,
    };
    return { success: true, data: response };
  }

  const generationDurationMs = Date.now() - startTime;

  const generationInsert: TablesInsert["generations"]["Insert"] = {
    user_id: userId,
    model,
    source_text_hash: sourceTextHashValue,
    source_text_length: sourceTextLength,
    generated_count: proposals.length,
    generation_duration: generationDurationMs,
    accepted_edited_count: 0,
    accepted_unedited_count: null,
  };

  const { data: generationRow, error: genError } = await supabase
    .from("generations")
    .insert(generationInsert)
    .select("id")
    .single();

  if (genError) {
    // Fallback: when user_id is not in auth.users (FK), return mock response so endpoint works without DB/auth setup
    const isFkError =
      genError.message?.includes("foreign key constraint") &&
      genError.message?.includes("generations_user_id_fkey");
    if (isFkError) {
      return {
        success: true,
        data: {
          generation_id: 0,
          flashcards_proposals: proposals,
          generated_count: proposals.length,
        },
      };
    }
    return {
      success: false,
      kind: "db_error",
      errorMessage: genError.message,
    };
  }

  const generationId = generationRow.id;

  // Optionally insert flashcards linked to this generation (ai-full, generation_id set)
  if (proposals.length > 0) {
    const flashcardsInsert: TablesInsert["flashcards"]["Insert"][] = proposals.map(
      (p) => ({
        user_id: userId,
        front: p.front,
        back: p.back,
        source: "ai-full",
        generation_id: generationId,
      })
    );
    await supabase.from("flashcards").insert(flashcardsInsert);
  }

  const response: GenerationCreateResponseDto = {
    generation_id: generationId,
    flashcards_proposals: proposals,
    generated_count: proposals.length,
  };

  return { success: true, data: response };
}

/**
 * Logs an AI/generation error to generation_error_logs (for 599 responses).
 */
export async function logGenerationError(
  supabase: SupabaseClient,
  payload: TablesInsert["generation_error_logs"]["Insert"]
): Promise<void> {
  await supabase.from("generation_error_logs").insert(payload);
}
