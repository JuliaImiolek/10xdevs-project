import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useFlashcardGeneration } from "./useFlashcardGeneration";

const mockCreateFlashcards = vi.fn();

vi.mock("@/lib/flashcards-api", () => ({
  createFlashcards: (payload: unknown) => mockCreateFlashcards(payload),
}));

const TEXT_MIN = 1000;
const TEXT_MAX = 10000;

function makeText(len: number): string {
  return "a".repeat(len);
}

describe("useFlashcardGeneration", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    mockCreateFlashcards.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    if (typeof window !== "undefined") {
      (window as unknown as { fetch: typeof fetch }).fetch = fetchMock;
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe("stan początkowy i walidacja tekstu", () => {
    it("zwraca pusty text, puste flashcards, loading false, brak błędów", () => {
      const { result } = renderHook(() => useFlashcardGeneration());

      expect(result.current.text).toBe("");
      expect(result.current.flashcards).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.textError).toBeNull();
      expect(result.current.apiError).toBeNull();
      expect(result.current.displayError).toBeNull();
    });

    it("handleBlur przy pustym tekście: textError pozostaje null, validateText zwraca false", () => {
      const { result } = renderHook(() => useFlashcardGeneration());

      act(() => {
        result.current.handleBlur();
      });

      expect(result.current.textError).toBeNull();
      expect(result.current.validateText()).toBe(false);
    });

    it("handleBlur przy tekście krótszym niż 1000 znaków: ustawia textError i zwraca false", () => {
      const { result } = renderHook(() => useFlashcardGeneration());
      const short = makeText(TEXT_MIN - 1);

      act(() => {
        result.current.setText(short);
      });
      act(() => {
        result.current.handleBlur();
      });

      expect(result.current.textError).toContain("co najmniej 1000");
      expect(result.current.textError).toContain("999");
      expect(result.current.validateText()).toBe(false);
    });

    it("warunek brzegowy: 999 znaków – nieprawidłowy", () => {
      const { result } = renderHook(() => useFlashcardGeneration());

      act(() => {
        result.current.setText(makeText(999));
      });
      act(() => {
        result.current.handleBlur();
      });

      expect(result.current.validateText()).toBe(false);
    });

    it("handleBlur przy tekście 1000–10000 znaków: textError null, validateText true", () => {
      const { result } = renderHook(() => useFlashcardGeneration());
      const valid = makeText(TEXT_MIN);

      act(() => {
        result.current.setText(valid);
      });
      act(() => {
        result.current.handleBlur();
      });

      expect(result.current.textError).toBeNull();
      expect(result.current.validateText()).toBe(true);
    });

    it("warunek brzegowy: 10000 znaków – prawidłowy", () => {
      const { result } = renderHook(() => useFlashcardGeneration());

      act(() => {
        result.current.setText(makeText(TEXT_MAX));
      });
      act(() => {
        result.current.handleBlur();
      });

      expect(result.current.textError).toBeNull();
      expect(result.current.validateText()).toBe(true);
    });

    it("handleBlur przy tekście dłuższym niż 10000: ustawia textError i zwraca false", () => {
      const { result } = renderHook(() => useFlashcardGeneration());
      const long = makeText(TEXT_MAX + 1);

      act(() => {
        result.current.setText(long);
      });
      act(() => {
        result.current.handleBlur();
      });

      expect(result.current.textError).toContain("co najwyżej 10000");
      expect(result.current.textError).toContain("10001");
      expect(result.current.validateText()).toBe(false);
    });
  });

  describe("handleGenerate", () => {
    it("nie wywołuje fetch gdy walidacja tekstu nie przechodzi", async () => {
      const { result } = renderHook(() => useFlashcardGeneration());

      act(() => {
        result.current.setText("za krótki");
        result.current.handleGenerate();
      });

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("wywołuje POST /api/generations z source_text gdy tekst prawidłowy", async () => {
      fetchMock.mockResolvedValue(
        new Response(
          JSON.stringify({ generation_id: 1, flashcards_proposals: [] }),
          { status: 200 }
        )
      );
      const { result } = renderHook(() => useFlashcardGeneration());
      const text = makeText(TEXT_MIN);

      act(() => {
        result.current.setText(text);
      });
      act(() => {
        result.current.handleGenerate();
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/generations",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source_text: text }),
        })
      );
    });

  });

  describe("handleListAction", () => {
    it("wywołanie handleListAction z id nie z listy nie zmienia stanu", () => {
      const { result } = renderHook(() => useFlashcardGeneration());

      act(() => {
        result.current.handleListAction("nieistniejacy-id", "accept");
      });

      expect(result.current.flashcards).toEqual([]);
    });
  });

  describe("handleFlashcardUpdate", () => {
    it("wywołanie handleFlashcardUpdate z id nie z listy nie zmienia stanu", () => {
      const { result } = renderHook(() => useFlashcardGeneration());

      act(() => {
        result.current.handleFlashcardUpdate(
          "nieistniejacy-id",
          "Front",
          "Back"
        );
      });

      expect(result.current.flashcards).toEqual([]);
    });
  });

  describe("handleSave", () => {
    it("przy pustej tablicy nie wywołuje createFlashcards", async () => {
      const { result } = renderHook(() => useFlashcardGeneration());

      await act(async () => {
        await result.current.handleSave([]);
      });

      expect(mockCreateFlashcards).not.toHaveBeenCalled();
    });

    it("wywołuje createFlashcards z przekazanymi DTO", async () => {
      mockCreateFlashcards.mockResolvedValue({ ok: true });
      const { result } = renderHook(() => useFlashcardGeneration());
      const toSave = [
        {
          front: "F",
          back: "B",
          source: "manual" as const,
          generation_id: null,
        },
      ];

      await act(async () => {
        await result.current.handleSave(toSave);
      });

      expect(mockCreateFlashcards).toHaveBeenCalledWith(toSave);
    });

    it("przy błędzie API ustawia apiError z message lub error lub fallback", async () => {
      mockCreateFlashcards.mockResolvedValue({
        ok: false,
        error: { message: "Błąd zapisu", status: 400 },
      });
      const { result } = renderHook(() => useFlashcardGeneration());

      await act(async () => {
        await result.current.handleSave([
          {
            front: "F",
            back: "B",
            source: "manual",
            generation_id: null,
          },
        ]);
      });

      expect(result.current.apiError).toBe("Błąd zapisu");
    });

    it("przed handleSave zeruje apiError", async () => {
      mockCreateFlashcards
        .mockResolvedValueOnce({
          ok: false,
          error: { message: "Pierwszy błąd" },
        })
        .mockResolvedValueOnce({ ok: true });
      const dto = {
        front: "F",
        back: "B",
        source: "manual" as const,
        generation_id: null as number | null,
      };
      const { result } = renderHook(() => useFlashcardGeneration());

      await act(async () => {
        await result.current.handleSave([dto]);
      });
      expect(result.current.apiError).toBe("Pierwszy błąd");

      await act(async () => {
        await result.current.handleSave([dto]);
      });
      expect(result.current.apiError).toBeNull();
    });
  });

  describe("displayError", () => {
    it("zwraca textError po handleBlur przy nieprawidłowym tekście", () => {
      const { result } = renderHook(() => useFlashcardGeneration());

      act(() => {
        result.current.setText("x");
      });
      act(() => {
        result.current.handleBlur();
      });

      expect(result.current.textError).toBeTruthy();
      expect(String(result.current.textError)).toContain("1000");
      expect(result.current.displayError).toBe(result.current.textError);
    });

    it("zwraca null gdy tekst prawidłowy po handleBlur", () => {
      const { result } = renderHook(() => useFlashcardGeneration());

      act(() => {
        result.current.setText(makeText(TEXT_MIN));
      });
      act(() => {
        result.current.handleBlur();
      });

      expect(result.current.textError).toBeNull();
      expect(result.current.displayError).toBeNull();
    });
  });
});
