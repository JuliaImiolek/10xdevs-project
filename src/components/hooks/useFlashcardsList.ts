import * as React from "react";
import type {
  FlashcardDto,
  PaginationDto,
  FlashcardsListSort,
} from "@/types";
import { fetchFlashcardsList } from "@/lib/flashcards-api";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const DEFAULT_SORT: FlashcardsListSort = "created_at_desc";

export interface UseFlashcardsListResult {
  data: FlashcardDto[];
  pagination: PaginationDto;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  page: number;
  setPage: (page: number) => void;
  limit: number;
  sort: FlashcardsListSort;
  setSort: (sort: FlashcardsListSort) => void;
  sourceFilter: "manual" | "ai-full" | "ai-edited" | undefined;
  setSourceFilter: (source: "manual" | "ai-full" | "ai-edited" | undefined) => void;
}

/**
 * Fetches and manages the flashcards list (GET /api/flashcards).
 * Refetches when page, limit, sort, or sourceFilter change.
 * On 401 sets error (caller may redirect to login); on 500 sets error message.
 */
export function useFlashcardsList(): UseFlashcardsListResult {
  const [data, setData] = React.useState<FlashcardDto[]>([]);
  const [pagination, setPagination] = React.useState<PaginationDto>({
    page: DEFAULT_PAGE,
    limit: DEFAULT_LIMIT,
    total: 0,
  });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [page, setPage] = React.useState(DEFAULT_PAGE);
  const [limit] = React.useState(DEFAULT_LIMIT);
  const [sort, setSort] = React.useState<FlashcardsListSort>(DEFAULT_SORT);
  const [sourceFilter, setSourceFilter] = React.useState<
    "manual" | "ai-full" | "ai-edited" | undefined
  >(undefined);

  const fetchList = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await fetchFlashcardsList({
      page,
      limit,
      sort,
      source: sourceFilter,
    });

    setLoading(false);

    if (result.ok) {
      setData(result.data.data);
      setPagination(result.data.pagination);
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
  }, [page, limit, sort, sourceFilter]);

  React.useEffect(() => {
    fetchList();
  }, [fetchList]);

  const refetch = React.useCallback(async () => {
    await fetchList();
  }, [fetchList]);

  return {
    data,
    pagination,
    loading,
    error,
    refetch,
    page,
    setPage,
    limit,
    sort,
    setSort,
    sourceFilter,
    setSourceFilter,
  };
}
