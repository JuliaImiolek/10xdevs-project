import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useSessionFlashcards } from "./useSessionFlashcards";
import type { FlashcardDto } from "@/types";

const mockFetchFlashcardsList = vi.fn();

vi.mock("@/lib/flashcards-api", () => ({
  fetchFlashcardsList: (params: unknown) => mockFetchFlashcardsList(params),
}));

describe("useSessionFlashcards", () => {
  beforeEach(() => {
    mockFetchFlashcardsList.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("początkowe ładowanie (reguła: sesja z forSession=true)", () => {
    it("wywołuje fetchFlashcardsList z parametrami sesji: page=1, limit=50, forSession=true", async () => {
      mockFetchFlashcardsList.mockResolvedValue({
        ok: true,
        data: { data: [], pagination: { page: 1, limit: 50, total: 0 } },
      });

      renderHook(() => useSessionFlashcards());

      await waitFor(() => {
        expect(mockFetchFlashcardsList).toHaveBeenCalledTimes(1);
        expect(mockFetchFlashcardsList).toHaveBeenCalledWith({
          page: 1,
          limit: 50,
          sort: "created_at_desc",
          forSession: true,
        });
      });
    });

    it("ustawia loading na true na starcie, potem false po odpowiedzi", async () => {
      mockFetchFlashcardsList.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  data: { data: [], pagination: { page: 1, limit: 50, total: 0 } },
                }),
              0
            );
          })
      );

      const { result } = renderHook(() => useSessionFlashcards());

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it("ustawia data na listę fiszek i error na null po sukcesie", async () => {
      const data: FlashcardDto[] = [
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
      mockFetchFlashcardsList.mockResolvedValue({
        ok: true,
        data: { data, pagination: { page: 1, limit: 50, total: 1 } },
      });

      const { result } = renderHook(() => useSessionFlashcards());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(data);
      expect(result.current.error).toBeNull();
    });
  });

  describe("obsługa błędów API (warunki brzegowe)", () => {
    it("ustawia error na komunikat o sesji przy 401 (reguła biznesowa: wylogowanie)", async () => {
      mockFetchFlashcardsList.mockResolvedValue({
        ok: false,
        error: { status: 401, message: "Unauthorized" },
      });

      const { result } = renderHook(() => useSessionFlashcards());

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

      const { result } = renderHook(() => useSessionFlashcards());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe("Invalid sort");
    });

    it("ustawia error na fallback przy 400 bez message (warunek brzegowy)", async () => {
      mockFetchFlashcardsList.mockResolvedValue({
        ok: false,
        error: { status: 400 },
      });

      const { result } = renderHook(() => useSessionFlashcards());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe("Nieprawidłowe parametry listy.");
    });

    it("ustawia error na message przy 500, fallback gdy brak message", async () => {
      mockFetchFlashcardsList.mockResolvedValue({
        ok: false,
        error: { status: 500, message: "Server error" },
      });

      const { result } = renderHook(() => useSessionFlashcards());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe("Server error");
    });

    it("ustawia error na fallback gdy status 500 bez message", async () => {
      mockFetchFlashcardsList.mockResolvedValue({
        ok: false,
        error: { status: 500 },
      });

      const { result } = renderHook(() => useSessionFlashcards());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe("Wystąpił błąd. Spróbuj ponownie.");
    });
  });

  describe("refetch", () => {
    it("refetch wywołuje ponownie fetchFlashcardsList z tymi samymi parametrami sesji", async () => {
      mockFetchFlashcardsList.mockResolvedValue({
        ok: true,
        data: { data: [], pagination: { page: 1, limit: 50, total: 0 } },
      });

      const { result } = renderHook(() => useSessionFlashcards());

      await waitFor(() => {
        expect(mockFetchFlashcardsList).toHaveBeenCalledTimes(1);
      });

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockFetchFlashcardsList).toHaveBeenCalledTimes(2);
      expect(mockFetchFlashcardsList).toHaveBeenNthCalledWith(2, {
        page: 1,
        limit: 50,
        sort: "created_at_desc",
        forSession: true,
      });
    });

    it("po refetch przy błędzie nadpisuje data/error wynikiem nowego wywołania", async () => {
      mockFetchFlashcardsList
        .mockResolvedValueOnce({
          ok: false,
          error: { status: 500, message: "Server error" },
        })
        .mockResolvedValueOnce({
          ok: true,
          data: {
            data: [{ id: 1, front: "F", back: "B", source: "manual", generation_id: null, created_at: "", updated_at: "" }],
            pagination: { page: 1, limit: 50, total: 1 },
          },
        });

      const { result } = renderHook(() => useSessionFlashcards());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe("Server error");
      });

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.data).toHaveLength(1);
        expect(result.current.data[0].front).toBe("F");
      });
    });
  });

  describe("wartości zwracane", () => {
    it("zwraca data, loading, error, refetch z poprawnymi typami", async () => {
      mockFetchFlashcardsList.mockResolvedValue({
        ok: true,
        data: { data: [], pagination: { page: 1, limit: 50, total: 0 } },
      });

      const { result } = renderHook(() => useSessionFlashcards());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(Array.isArray(result.current.data)).toBe(true);
      expect(typeof result.current.loading).toBe("boolean");
      expect(result.current.error === null || typeof result.current.error === "string").toBe(true);
      expect(typeof result.current.refetch).toBe("function");
    });
  });
});
