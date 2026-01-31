import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useFlashcardsList } from "./useFlashcardsList";
import type { FlashcardsListResponseDto } from "@/types";

const mockFetchFlashcardsList = vi.fn();

vi.mock("@/lib/flashcards-api", () => ({
  fetchFlashcardsList: (params: unknown) => mockFetchFlashcardsList(params),
}));

describe("useFlashcardsList", () => {
  beforeEach(() => {
    mockFetchFlashcardsList.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("początkowe ładowanie", () => {
    it("wywołuje fetchFlashcardsList z domyślnymi parametrami", async () => {
      mockFetchFlashcardsList.mockResolvedValue({
        ok: true,
        data: { data: [], pagination: { page: 1, limit: 20, total: 0 } },
      });

      renderHook(() => useFlashcardsList());

      await waitFor(() => {
        expect(mockFetchFlashcardsList).toHaveBeenCalledTimes(1);
        expect(mockFetchFlashcardsList).toHaveBeenCalledWith({
          page: 1,
          limit: 20,
          sort: "created_at_desc",
          source: undefined,
        });
      });
    });

    it("ustawia loading na true, potem na false po odpowiedzi", async () => {
      mockFetchFlashcardsList.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  data: { data: [], pagination: { page: 1, limit: 20, total: 0 } },
                }),
              0
            );
          })
      );

      const { result } = renderHook(() => useFlashcardsList());

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it("ustawia data i pagination po sukcesie", async () => {
      const data = [
        {
          id: 1,
          front: "Pytanie",
          back: "Odpowiedź",
          source: "manual",
          generation_id: null,
          created_at: "2025-01-01",
          updated_at: "2025-01-01",
        },
      ];
      const pagination = { page: 1, limit: 20, total: 1 };
      mockFetchFlashcardsList.mockResolvedValue({
        ok: true,
        data: { data, pagination } as FlashcardsListResponseDto,
      });

      const { result } = renderHook(() => useFlashcardsList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(data);
      expect(result.current.pagination).toEqual(pagination);
      expect(result.current.error).toBeNull();
    });
  });

  describe("obsługa błędów API", () => {
    it("ustawia error na komunikat sesji przy 401", async () => {
      mockFetchFlashcardsList.mockResolvedValue({
        ok: false,
        error: { status: 401, message: "Unauthorized" },
      });

      const { result } = renderHook(() => useFlashcardsList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe("Sesja wygasła. Zaloguj się ponownie.");
      expect(result.current.data).toEqual([]);
    });

    it("ustawia error na message przy 400", async () => {
      mockFetchFlashcardsList.mockResolvedValue({
        ok: false,
        error: { status: 400, message: "Invalid sort" },
      });

      const { result } = renderHook(() => useFlashcardsList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe("Invalid sort");
    });

    it("ustawia error na fallback przy 400 bez message", async () => {
      mockFetchFlashcardsList.mockResolvedValue({
        ok: false,
        error: { status: 400 },
      });

      const { result } = renderHook(() => useFlashcardsList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe("Nieprawidłowe parametry listy.");
    });

    it("ustawia error na message przy 500", async () => {
      mockFetchFlashcardsList.mockResolvedValue({
        ok: false,
        error: { status: 500, message: "Server error" },
      });

      const { result } = renderHook(() => useFlashcardsList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe("Server error");
    });
  });

  describe("refetch i zmiana parametrów", () => {
    it("refetch wywołuje ponownie fetchFlashcardsList", async () => {
      mockFetchFlashcardsList.mockResolvedValue({
        ok: true,
        data: { data: [], pagination: { page: 1, limit: 20, total: 0 } },
      });

      const { result } = renderHook(() => useFlashcardsList());

      await waitFor(() => {
        expect(mockFetchFlashcardsList).toHaveBeenCalledTimes(1);
      });

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockFetchFlashcardsList).toHaveBeenCalledTimes(2);
    });

    it("setPage powoduje ponowne wywołanie fetch z nowym page", async () => {
      mockFetchFlashcardsList.mockResolvedValue({
        ok: true,
        data: { data: [], pagination: { page: 1, limit: 20, total: 0 } },
      });

      const { result } = renderHook(() => useFlashcardsList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setPage(2);
      });

      await waitFor(() => {
        expect(mockFetchFlashcardsList).toHaveBeenLastCalledWith(
          expect.objectContaining({ page: 2 })
        );
      });
    });

    it("setSort powoduje ponowne wywołanie fetch z nowym sort", async () => {
      mockFetchFlashcardsList.mockResolvedValue({
        ok: true,
        data: { data: [], pagination: { page: 1, limit: 20, total: 0 } },
      });

      const { result } = renderHook(() => useFlashcardsList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setSort("updated_at");
      });

      await waitFor(() => {
        expect(mockFetchFlashcardsList).toHaveBeenLastCalledWith(
          expect.objectContaining({ sort: "updated_at" })
        );
      });
    });

    it("setSourceFilter powoduje ponowne wywołanie fetch z source", async () => {
      mockFetchFlashcardsList.mockResolvedValue({
        ok: true,
        data: { data: [], pagination: { page: 1, limit: 20, total: 0 } },
      });

      const { result } = renderHook(() => useFlashcardsList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.setSourceFilter("manual");
      });

      await waitFor(() => {
        expect(mockFetchFlashcardsList).toHaveBeenLastCalledWith(
          expect.objectContaining({ source: "manual" })
        );
      });
    });
  });

  describe("wartości zwracane", () => {
    it("zwraca page, setPage, sort, setSort, sourceFilter, setSourceFilter, limit", async () => {
      mockFetchFlashcardsList.mockResolvedValue({
        ok: true,
        data: { data: [], pagination: { page: 1, limit: 20, total: 0 } },
      });

      const { result } = renderHook(() => useFlashcardsList());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.page).toBe(1);
      expect(typeof result.current.setPage).toBe("function");
      expect(result.current.sort).toBe("created_at_desc");
      expect(typeof result.current.setSort).toBe("function");
      expect(result.current.sourceFilter).toBeUndefined();
      expect(typeof result.current.setSourceFilter).toBe("function");
      expect(result.current.limit).toBe(20);
    });
  });
});
