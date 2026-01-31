/**
 * Client-side API for flashcards: list (GET), update (PUT), delete (DELETE).
 * Used by the flashcards view and useFlashcardsList hook.
 */
import type {
  FlashcardCreateDto,
  FlashcardDto,
  FlashcardsListQueryParams,
  FlashcardsListResponseDto,
  FlashcardPutPayload,
} from "../types";

export type ApiError = {
  status: number;
  error?: string;
  message?: string;
  details?: Record<string, string[] | undefined>;
};

export type ListResult =
  | { ok: true; data: FlashcardsListResponseDto }
  | { ok: false; error: ApiError };

export type UpdateResult =
  | { ok: true; data: FlashcardDto }
  | { ok: false; error: ApiError };

export type DeleteResult =
  | { ok: true; data: { message: string } }
  | { ok: false; error: ApiError };

export type CreateResult =
  | { ok: true; data: { flashcards: FlashcardDto[] } }
  | { ok: false; error: ApiError };

function buildListUrl(params: FlashcardsListQueryParams): string {
  const search = new URLSearchParams();
  search.set("page", String(params.page));
  search.set("limit", String(params.limit));
  search.set("sort", params.sort);
  if (params.source != null) {
    search.set("source", params.source);
  }
  if (params.forSession === true) {
    search.set("forSession", "true");
  }
  return `/api/flashcards?${search.toString()}`;
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (text.length === 0) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}

/**
 * GET /api/flashcards – list flashcards with pagination, sort, and optional source filter.
 */
export async function fetchFlashcardsList(
  params: FlashcardsListQueryParams
): Promise<ListResult> {
  const url = buildListUrl(params);
  const response = await fetch(url, { method: "GET", credentials: "include" });

  const body = await parseJsonResponse<FlashcardsListResponseDto | { error?: string; message?: string; details?: Record<string, string[] | undefined> }>(
    response
  );

  if (response.ok) {
    return { ok: true, data: body as FlashcardsListResponseDto };
  }

  const err = body as { error?: string; message?: string; details?: Record<string, string[] | undefined> };
  return {
    ok: false,
    error: {
      status: response.status,
      error: err.error,
      message: err.message,
      details: err.details,
    },
  };
}

/**
 * PUT /api/flashcards/{id} – update a flashcard. Body: FlashcardPutPayload.
 */
export async function updateFlashcard(
  id: number,
  payload: FlashcardPutPayload
): Promise<UpdateResult> {
  const response = await fetch(`/api/flashcards/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = await parseJsonResponse<FlashcardDto | { error?: string; message?: string; details?: Record<string, string[] | undefined> }>(
    response
  );

  if (response.ok) {
    return { ok: true, data: body as FlashcardDto };
  }

  const err = body as { error?: string; message?: string; details?: Record<string, string[] | undefined> };
  return {
    ok: false,
    error: {
      status: response.status,
      error: err.error,
      message: err.message,
      details: err.details,
    },
  };
}

/**
 * POST /api/flashcards – create one or more flashcards.
 * Body: { flashcards: FlashcardCreateDto[] }.
 */
export async function createFlashcards(
  flashcards: FlashcardCreateDto[]
): Promise<CreateResult> {
  if (flashcards.length === 0) {
    return {
      ok: false,
      error: {
        status: 400,
        message: "At least one flashcard is required",
      },
    };
  }

  const response = await fetch("/api/flashcards", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ flashcards }),
  });

  const body = await parseJsonResponse<
    { flashcards?: FlashcardDto[] } | { error?: string; message?: string; details?: Record<string, string[] | undefined> }
  >(response);

  if (response.ok && body && "flashcards" in body) {
    return { ok: true, data: { flashcards: body.flashcards ?? [] } };
  }

  const err = body as { error?: string; message?: string; details?: Record<string, string[] | undefined> };
  return {
    ok: false,
    error: {
      status: response.status,
      error: err.error,
      message: err.message,
      details: err.details,
    },
  };
}

/**
 * POST /api/flashcards/{id}/review – record SRS review (grade 1–3: Źle, Średnio, Dobrze).
 */
export type ReviewResult =
  | { ok: true }
  | { ok: false; error: ApiError };

export async function submitReview(
  id: number,
  grade: 1 | 2 | 3
): Promise<ReviewResult> {
  const response = await fetch(`/api/flashcards/${id}/review`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ grade }),
  });

  const body = await parseJsonResponse<{ ok?: boolean; error?: string; message?: string }>(
    response
  );

  if (response.ok && body && body.ok !== false) {
    return { ok: true };
  }

  const err = body as { error?: string; message?: string };
  return {
    ok: false,
    error: {
      status: response.status,
      error: err.error,
      message: err.message,
    },
  };
}

/**
 * DELETE /api/flashcards/{id} – delete a flashcard.
 */
export async function deleteFlashcard(id: number): Promise<DeleteResult> {
  const response = await fetch(`/api/flashcards/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  const body = await parseJsonResponse<{ message?: string; error?: string }>(
    response
  );

  if (response.ok) {
    const data = body as { message?: string };
    return { ok: true, data: { message: data.message ?? "Flashcard deleted" } };
  }

  const err = body as { error?: string; message?: string };
  return {
    ok: false,
    error: {
      status: response.status,
      error: err.error,
      message: err.message,
    },
  };
}
