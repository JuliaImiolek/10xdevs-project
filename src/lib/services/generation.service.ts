/**
 * GenerationService: orchestrates AI flashcard generation, DB writes for generations
 * and optional flashcards, and error logging to generation_error_logs.
 * Uses OpenRouterService for LLM-based flashcard proposals.
 */
import { createHash } from "node:crypto";
import type { SupabaseClient } from "../../db/supabase.client";
import type { Database } from "../../db/database.types";
import type {
  FlashcardProposalDto,
  GenerationCreateResponseDto,
  GenerationErrorLogDto,
  GenerationErrorLogsListResponseDto,
  GenerationListItemDto,
  GenerationsListResponseDto,
} from "../../types";
import type { GenerationRequestInput } from "../../pages/api/generations";
import { OpenRouterService } from "./openrouter.service";

type TablesInsert = Database["public"]["Tables"];

/** Default AI model name used for generation (stored in generations.model). Aligns with OpenRouter. */
const DEFAULT_MODEL = "openai/gpt-oss-120b:free";

/** Expected JSON shape from LLM: object with "flashcards" array of { front, back }. */
interface LlmFlashcardsResponse {
  flashcards?: Array<{ front?: string; back?: string }>;
}

/** System prompt for flashcard generation: instructs LLM to return JSON only. */
const FLASHCARD_SYSTEM_PROMPT = `You are a flashcard generator. Given a text (e.g. article, notes), produce a list of flashcards.
Each flashcard has:
- "front": short question or term (concise, max ~200 chars).
- "back": short answer or definition (concise, max ~500 chars).

Return ONLY valid JSON, no other text. Use this exact structure:
{"flashcards": [{"front": "...", "back": "..."}, ...]}

Generate a reasonable number of flashcards (typically 3–15) based on the content. Focus on key concepts and facts.`;

const openRouter = new OpenRouterService();

/**
 * MD5 hash for source_text (for storage; used in generations and generation_error_logs).
 */
function sourceTextHash(text: string): string {
  return createHash("md5").update(text, "utf8").digest("hex");
}

/** Result of calling OpenRouter for flashcard proposals. */
type CallOpenRouterResult =
  | { success: true; proposals: FlashcardProposalDto[] }
  | { success: false; errorCode: string; errorMessage: string };

/**
 * Calls OpenRouter LLM to generate flashcard proposals from source text.
 * Returns proposals or error details for logging and API response.
 */
async function callOpenRouterForFlashcards(
  sourceText: string,
  model: string
): Promise<CallOpenRouterResult> {
  const result = await openRouter.chatWithStructuredOutput<LlmFlashcardsResponse>({
    systemMessage: FLASHCARD_SYSTEM_PROMPT,
    userMessage: sourceText,
    model,
    responseFormat: { type: "json_object" },
    max_tokens: 4096,
    temperature: 0.3,
  });

  if (!result.success) {
    return {
      success: false,
      errorCode: String(result.errorCode),
      errorMessage: result.errorMessage,
    };
  }

  const raw = result.data?.flashcards;
  if (!Array.isArray(raw) || raw.length === 0) {
    return {
      success: false,
      errorCode: "INVALID_RESPONSE",
      errorMessage: "Model did not return a non-empty flashcards array",
    };
  }

  const proposals: FlashcardProposalDto[] = raw
    .filter((item) => item != null && (item.front != null || item.back != null))
    .map((item) => ({
      front: String(item.front ?? "").trim() || "?",
      back: String(item.back ?? "").trim() || "?",
      source: "ai-full" as const,
    }));

  if (proposals.length === 0) {
    return {
      success: false,
      errorCode: "INVALID_RESPONSE",
      errorMessage: "No valid flashcard entries in model response",
    };
  }

  return { success: true, proposals };
}

export type CreateGenerationResult =
  | { success: true; data: GenerationCreateResponseDto }
  | { success: false; kind: "ai_error"; errorCode: string; errorMessage: string }
  | { success: false; kind: "db_error"; errorMessage: string };

/** Options for listing generations: pagination, sort, and optional filters. */
export interface ListGenerationsFilter {
  model?: string;
  created_after?: string;
  created_before?: string;
  source_text_length_min?: number;
  source_text_length_max?: number;
}

export interface ListGenerationsOptions {
  page: number;
  limit: number;
  sort:
    | "created_at"
    | "created_at_desc"
    | "updated_at"
    | "updated_at_desc"
    | "model"
    | "model_desc"
    | "generation_duration"
    | "generation_duration_desc";
  filter?: ListGenerationsFilter;
}

export type ListGenerationsResult =
  | { success: true; data: GenerationsListResponseDto }
  | { success: false; errorMessage: string };

/** Options for listing generation error logs: pagination, sort, and optional filters. */
export interface ListGenerationErrorLogsFilter {
  model?: string;
  created_after?: string;
  created_before?: string;
}

export interface ListGenerationErrorLogsOptions {
  page: number;
  limit: number;
  sort:
    | "created_at"
    | "created_at_desc"
    | "model"
    | "model_desc"
    | "error_code"
    | "error_code_desc";
  filter?: ListGenerationErrorLogsFilter;
}

export type ListGenerationErrorLogsResult =
  | { success: true; data: GenerationErrorLogsListResponseDto }
  | { success: false; errorMessage: string };

/**
 * Result of getGenerationById: either a single generation (or null when not found)
 * or a server/db error.
 */
export type GetGenerationByIdResult =
  | { success: true; data: GenerationListItemDto }
  | { success: true; data: null }
  | { success: false; errorMessage: string };

/**
 * Creates a generation: calls AI, inserts into generations, optionally inserts flashcards,
 * and returns the response DTO. On AI failure, logs to generation_error_logs and returns
 * ai_error (caller should respond with 599).
 * Requires DEFAULT_USER_ID to exist in auth.users (run scripts/seed-default-user.mjs once).
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

  const aiResult = await callOpenRouterForFlashcards(source_text, model);
  if (!aiResult.success) {
    await logGenerationError(supabase, {
      user_id: userId,
      model,
      source_text_hash: sourceTextHashValue,
      source_text_length: sourceTextLength,
      error_code: aiResult.errorCode,
      error_message: aiResult.errorMessage,
      generation_id: null,
    });
    return {
      success: false,
      kind: "ai_error",
      errorCode: aiResult.errorCode,
      errorMessage: aiResult.errorMessage,
    };
  }

  const proposals = aiResult.proposals;
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
 * Maps sort query value to Supabase column name and ascending flag.
 */
function mapSortToOrder(
  sort: ListGenerationsOptions["sort"]
): { column: keyof Database["public"]["Tables"]["generations"]["Row"]; ascending: boolean } {
  const map: Record<
    ListGenerationsOptions["sort"],
    { column: keyof Database["public"]["Tables"]["generations"]["Row"]; ascending: boolean }
  > = {
    created_at: { column: "created_at", ascending: true },
    created_at_desc: { column: "created_at", ascending: false },
    updated_at: { column: "updated_at", ascending: true },
    updated_at_desc: { column: "updated_at", ascending: false },
    model: { column: "model", ascending: true },
    model_desc: { column: "model", ascending: false },
    generation_duration: { column: "generation_duration", ascending: true },
    generation_duration_desc: { column: "generation_duration", ascending: false },
  };
  return map[sort];
}

type GenerationErrorLogRow = Database["public"]["Tables"]["generation_error_logs"]["Row"];

/**
 * Maps sort query value to generation_error_logs column and direction.
 */
function mapSortToOrderErrorLogs(
  sort: ListGenerationErrorLogsOptions["sort"]
): { column: keyof GenerationErrorLogRow; ascending: boolean } {
  const map: Record<
    ListGenerationErrorLogsOptions["sort"],
    { column: keyof GenerationErrorLogRow; ascending: boolean }
  > = {
    created_at: { column: "created_at", ascending: true },
    created_at_desc: { column: "created_at", ascending: false },
    model: { column: "model", ascending: true },
    model_desc: { column: "model", ascending: false },
    error_code: { column: "error_code", ascending: true },
    error_code_desc: { column: "error_code", ascending: false },
  };
  return map[sort];
}

/**
 * Lists generations for a user with pagination, sort, and optional filters.
 * Used by GET /api/generations. Always filters by user_id from context (authorization).
 */
export async function listGenerations(
  supabase: SupabaseClient,
  userId: string,
  options: ListGenerationsOptions
): Promise<ListGenerationsResult> {
  const { page, limit, sort, filter } = options;
  const from = (page - 1) * limit;
  const to = page * limit - 1;
  const { column, ascending } = mapSortToOrder(sort);

  let query = supabase
    .from("generations")
    .select("*", { count: "exact", head: false })
    .eq("user_id", userId);

  if (filter?.model) {
    query = query.eq("model", filter.model);
  }
  if (filter?.created_after) {
    query = query.gte("created_at", filter.created_after);
  }
  if (filter?.created_before) {
    query = query.lte("created_at", filter.created_before);
  }
  if (filter?.source_text_length_min !== undefined) {
    query = query.gte("source_text_length", filter.source_text_length_min);
  }
  if (filter?.source_text_length_max !== undefined) {
    query = query.lte("source_text_length", filter.source_text_length_max);
  }

  query = query.order(column, { ascending }).range(from, to);

  const { data: rows, error, count } = await query;

  if (error) {
    return { success: false, errorMessage: error.message };
  }

  const total = count ?? 0;
  const data: GenerationListItemDto[] = (rows ?? []) as GenerationListItemDto[];
  const response: GenerationsListResponseDto = {
    data,
    pagination: { page, limit, total },
  };

  return { success: true, data: response };
}

/**
 * Fetches a single generation by id for the given user.
 * Used by GET /api/generations/{id}. Filters by user_id for authorization.
 *
 * @returns { success: true, data } when a row is found; { success: true, data: null } when not found;
 *          { success: false, errorMessage } on DB/server error (caller should respond with 500).
 */
export async function getGenerationById(
  supabase: SupabaseClient,
  userId: string,
  id: number
): Promise<GetGenerationByIdResult> {
  const { data: row, error } = await supabase
    .from("generations")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[getGenerationById] DB error:", error.message);
    return { success: false, errorMessage: error.message };
  }

  if (row == null) {
    return { success: true, data: null };
  }

  const dto: GenerationListItemDto = row as GenerationListItemDto;
  return { success: true, data: dto };
}

/**
 * Lists generation error logs for a user with pagination, sort, and optional filters.
 * Used by GET /api/generation-error-logs. Always filters by user_id (authorization).
 */
export async function listGenerationErrorLogs(
  supabase: SupabaseClient,
  userId: string,
  options: ListGenerationErrorLogsOptions
): Promise<ListGenerationErrorLogsResult> {
  const { page, limit, sort, filter } = options;
  const from = (page - 1) * limit;
  const to = page * limit - 1;
  const { column, ascending } = mapSortToOrderErrorLogs(sort);

  let query = supabase
    .from("generation_error_logs")
    .select("*", { count: "exact", head: false })
    .eq("user_id", userId);

  if (filter?.model) {
    query = query.eq("model", filter.model);
  }
  if (filter?.created_after) {
    query = query.gte("created_at", filter.created_after);
  }
  if (filter?.created_before) {
    query = query.lte("created_at", filter.created_before);
  }

  query = query.order(column, { ascending }).range(from, to);

  const { data: rows, error, count } = await query;

  if (error) {
    console.error("[listGenerationErrorLogs] DB error:", error.message);
    return { success: false, errorMessage: error.message };
  }

  const total = count ?? 0;
  const data: GenerationErrorLogDto[] = (rows ?? []).map((row) => {
    const r = row as GenerationErrorLogRow;
    return {
      id: r.id,
      user_id: r.user_id,
      model: r.model,
      source_text_hash: r.source_text_hash,
      source_text_length: r.source_text_length,
      error_code: r.error_code,
      error_message: r.error_message,
      created_at: r.created_at,
    };
  });
  const response: GenerationErrorLogsListResponseDto = {
    data,
    pagination: { page, limit, total },
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
