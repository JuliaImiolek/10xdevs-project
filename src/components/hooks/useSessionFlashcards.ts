import * as React from "react";
import type { FlashcardDto } from "@/types";
import { fetchFlashcardsList } from "@/lib/flashcards-api";

const SESSION_PAGE = 1;
const SESSION_LIMIT = 50;
const SESSION_SORT = "created_at_desc" as const;
/** Fetches only cards due for review (SRS: next_review_at null or <= now). */
const SESSION_FOR_SESSION = true;

export interface UseSessionFlashcardsResult {
  data: FlashcardDto[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Fetches flashcards for the session view (GET /api/flashcards).
 * Uses fixed params: page=1, limit=50, sort=created_at_desc.
 * On 401 sets error (caller may show login link); on 500 sets error message.
 */
export function useSessionFlashcards(): UseSessionFlashcardsResult {
  const [data, setData] = React.useState<FlashcardDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchList = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await fetchFlashcardsList({
      page: SESSION_PAGE,
      limit: SESSION_LIMIT,
      sort: SESSION_SORT,
      forSession: SESSION_FOR_SESSION,
    });

    setLoading(false);

    if (result.ok) {
      setData(result.data.data);
      return;
    }

    const err = result.error;
    if (err.status === 401) {
      setError("Sesja wygasła. Zaloguj się ponownie.");
      return;
    }
    if (err.status === 400) {
      setError(err.message ?? "Nieprawidłowe parametry listy.");
      return;
    }
    setError(err.message ?? "Wystąpił błąd. Spróbuj ponownie.");
  }, []);

  React.useEffect(() => {
    fetchList();
  }, [fetchList]);

  const refetch = React.useCallback(async () => {
    await fetchList();
  }, [fetchList]);

  return {
    data,
    loading,
    error,
    refetch,
  };
}
