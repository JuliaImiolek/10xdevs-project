import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchFlashcardsList,
  createFlashcards,
  updateFlashcard,
  deleteFlashcard,
  submitReview,
} from "./flashcards-api";
import type { FlashcardCreateDto, FlashcardDto } from "@/types";

describe("flashcards-api", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve(new Response()))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("fetchFlashcardsList", () => {
    it("buduje URL z page, limit, sort i wywołuje GET", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            data: [],
            pagination: { page: 1, limit: 20, total: 0 },
          }),
          { status: 200 }
        )
      );

      await fetchFlashcardsList({
        page: 2,
        limit: 10,
        sort: "updated_at_desc",
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe(
        "/api/flashcards?page=2&limit=10&sort=updated_at_desc"
      );
      expect(options).toMatchObject({ method: "GET", credentials: "include" });
    });

    it("dodaje parametr source do URL gdy podany", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify({ data: [], pagination: { page: 1, limit: 20, total: 0 } }),
          { status: 200 }
        )
      );

      await fetchFlashcardsList({
        page: 1,
        limit: 20,
        sort: "created_at_desc",
        source: "manual",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/flashcards?page=1&limit=20&sort=created_at_desc&source=manual",
        expect.any(Object)
      );
    });

    it("dodaje forSession=true do URL gdy podany", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify({ data: [], pagination: { page: 1, limit: 20, total: 0 } }),
          { status: 200 }
        )
      );

      await fetchFlashcardsList({
        page: 1,
        limit: 20,
        sort: "created_at_desc",
        forSession: true,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/flashcards?page=1&limit=20&sort=created_at_desc&forSession=true",
        expect.any(Object)
      );
    });

    it("zwraca ok: true i dane gdy response.ok", async () => {
      const mockFetch = vi.mocked(fetch);
      const data = [{ id: 1, front: "F", back: "B", source: "manual" } as FlashcardDto];
      const pagination = { page: 1, limit: 20, total: 1 };
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ data, pagination }), { status: 200 })
      );

      const result = await fetchFlashcardsList({
        page: 1,
        limit: 20,
        sort: "created_at_desc",
      });

      expect(result).toEqual({ ok: true, data: { data, pagination } });
      expectTypeOf(result).toMatchTypeOf<
        { ok: true; data: { data: typeof data; pagination: typeof pagination } }
      >();
    });

    it("zwraca ok: false i error gdy status 401", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify({ message: "Unauthorized" }),
          { status: 401 }
        )
      );

      const result = await fetchFlashcardsList({
        page: 1,
        limit: 20,
        sort: "created_at_desc",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(401);
        expect(result.error.message).toBe("Unauthorized");
      }
    });

    it("zwraca ok: false z details gdy status 400 i body ma details", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            message: "Validation failed",
            details: { front: ["Za długie"] },
          }),
          { status: 400 }
        )
      );

      const result = await fetchFlashcardsList({
        page: 1,
        limit: 20,
        sort: "created_at_desc",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(400);
        expect(result.error.details).toEqual({ front: ["Za długie"] });
      }
    });

    it("obsługuje pustą odpowiedź (empty body)", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue(new Response("", { status: 500 }));

      const result = await fetchFlashcardsList({
        page: 1,
        limit: 20,
        sort: "created_at_desc",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(500);
      }
    });
  });

  describe("createFlashcards", () => {
    it("zwraca ok: false gdy tablica fiszek pusta (reguła biznesowa)", async () => {
      const result = await createFlashcards([]);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(400);
        expect(result.error.message).toBe("At least one flashcard is required");
      }
      expect(fetch).not.toHaveBeenCalled();
    });

    it("wysyła POST z body { flashcards } i zwraca ok: true przy 200", async () => {
      const mockFetch = vi.mocked(fetch);
      const created: FlashcardDto[] = [
        {
          id: 1,
          front: "Q",
          back: "A",
          source: "manual",
          generation_id: null,
          created_at: "",
          updated_at: "",
        },
      ];
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ flashcards: created }), { status: 200 })
      );

      const payload: FlashcardCreateDto[] = [
        { front: "Q", back: "A", source: "manual", generation_id: null },
      ];
      const result = await createFlashcards(payload);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/flashcards",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ flashcards: payload }),
        })
      );
      expect(result).toEqual({ ok: true, data: { flashcards: created } });
    });

    it("zwraca ok: false i error przy 4xx", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ message: "Invalid source" }), { status: 400 })
      );

      const result = await createFlashcards([
        { front: "Q", back: "A", source: "manual", generation_id: null },
      ]);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(400);
        expect(result.error.message).toBe("Invalid source");
      }
    });
  });

  describe("updateFlashcard", () => {
    it("wysyła PUT na /api/flashcards/{id} z payload", async () => {
      const mockFetch = vi.mocked(fetch);
      const updated: FlashcardDto = {
        id: 1,
        front: "Q2",
        back: "A2",
        source: "manual",
        generation_id: null,
        created_at: "",
        updated_at: "",
      };
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify(updated), { status: 200 })
      );

      const result = await updateFlashcard(1, {
        front: "Q2",
        back: "A2",
        source: "manual",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/flashcards/1",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({
            front: "Q2",
            back: "A2",
            source: "manual",
          }),
        })
      );
      expect(result).toEqual({ ok: true, data: updated });
    });

    it("zwraca ok: false z details przy 400", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            message: "Validation failed",
            details: { back: ["Maksymalnie 500 znaków."] },
          }),
          { status: 400 }
        )
      );

      const result = await updateFlashcard(1, {
        front: "F",
        back: "B",
        source: "manual",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.details).toEqual({ back: ["Maksymalnie 500 znaków."] });
      }
    });
  });

  describe("deleteFlashcard", () => {
    it("wysyła DELETE i zwraca ok: true z message", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ message: "Deleted" }), { status: 200 })
      );

      const result = await deleteFlashcard(5);

      expect(mockFetch).toHaveBeenCalledWith("/api/flashcards/5", {
        method: "DELETE",
        credentials: "include",
      });
      expect(result).toEqual({ ok: true, data: { message: "Deleted" } });
    });

    it("zwraca domyślny message gdy body bez message", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue(new Response("{}", { status: 200 }));

      const result = await deleteFlashcard(1);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.message).toBe("Flashcard deleted");
      }
    });

    it("zwraca ok: false przy 404", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ message: "Not found" }), { status: 404 })
      );

      const result = await deleteFlashcard(999);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(404);
      }
    });
  });

  describe("submitReview", () => {
    it("wysyła POST na /api/flashcards/{id}/review z grade", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

      const result = await submitReview(10, 2);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/flashcards/10/review",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ grade: 2 }),
        })
      );
      expect(result).toEqual({ ok: true });
    });

    it("zwraca ok: false gdy body.ok === false lub błąd HTTP", async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ message: "Card not found" }), { status: 404 })
      );

      const result = await submitReview(1, 3);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.status).toBe(404);
      }
    });
  });
});
