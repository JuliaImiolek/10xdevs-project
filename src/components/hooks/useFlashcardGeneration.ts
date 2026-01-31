import * as React from "react";
import type { FlashcardViewModel, FlashcardCreateDto } from "@/types";
import type { FlashcardItemAction } from "@/components/generate/FlashcardListItem";
import { createFlashcards } from "@/lib/flashcards-api";
import {
  TEXT_INPUT_MIN_LENGTH,
  TEXT_INPUT_MAX_LENGTH,
} from "@/components/generate/TextInputArea";

export interface UseFlashcardGenerationResult {
  text: string;
  setText: (value: string) => void;
  textError: string | null;
  validateText: () => boolean;
  handleBlur: () => void;
  flashcards: FlashcardViewModel[];
  loading: boolean;
  apiError: string | null;
  handleGenerate: () => void;
  handleListAction: (id: string, action: FlashcardItemAction) => void;
  handleFlashcardUpdate: (id: string, front: string, back: string) => void;
  handleSave: (toSave: FlashcardCreateDto[]) => void;
  displayError: string | null;
}

/**
 * Manages state and API calls for the flashcard generation view:
 * - Text input validation (1000–10000 chars)
 * - POST /api/generations
 * - Flashcard list state and actions (accept, edit, reject, update content)
 * - POST /api/flashcards for bulk save
 */
function useFlashcardGeneration(): UseFlashcardGenerationResult {
  const [text, setText] = React.useState("");
  const [textError, setTextError] = React.useState<string | null>(null);
  const [flashcards, setFlashcards] = React.useState<FlashcardViewModel[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);
  const [generationId, setGenerationId] = React.useState<number | null>(null);

  const validateText = React.useCallback((): boolean => {
    const len = text.length;
    if (len === 0) {
      setTextError(
        `Tekst musi mieć co najmniej ${TEXT_INPUT_MIN_LENGTH} znaków (aktualnie: 0).`
      );
      return false;
    }
    if (len < TEXT_INPUT_MIN_LENGTH) {
      setTextError(
        `Tekst musi mieć co najmniej ${TEXT_INPUT_MIN_LENGTH} znaków (aktualnie: ${len}).`
      );
      return false;
    }
    if (len > TEXT_INPUT_MAX_LENGTH) {
      setTextError(
        `Tekst może mieć co najwyżej ${TEXT_INPUT_MAX_LENGTH} znaków (aktualnie: ${len}).`
      );
      return false;
    }
    setTextError(null);
    return true;
  }, [text]);

  const handleBlur = React.useCallback(() => {
    validateText();
  }, [validateText]);

  const handleGenerate = React.useCallback(() => {
    setApiError(null);
    if (!validateText()) return;

    setLoading(true);
    fetch("/api/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_text: text }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msg = data?.message ?? data?.error ?? `Błąd ${res.status}`;
          throw new Error(msg);
        }
        setGenerationId(data.generation_id ?? null);
        const proposals = data.flashcards_proposals ?? [];
        const viewModels: FlashcardViewModel[] = proposals.map(
          (p: { front: string; back: string }, index: number) => ({
            id: `gen-${data.generation_id}-${index}`,
            front: p.front,
            back: p.back,
            source: "ai-full",
            generation_id: data.generation_id ?? null,
            status: "pending" as const,
          })
        );
        setFlashcards(viewModels);
      })
      .catch((err) => {
        const message =
          err instanceof Error ? err.message : "Wystąpił błąd.";
        // Network/connection errors (e.g. dev server not running, wrong origin)
        const isNetworkError =
          message === "fetch failed" ||
          message.includes("Failed to fetch") ||
          message.includes("NetworkError");
        setApiError(
          isNetworkError
            ? "Nie można połączyć z serwerem. Upewnij się, że aplikacja jest uruchomiona (npm run dev) i otwarta pod tym samym adresem."
            : message
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [text, validateText]);

  const handleListAction = React.useCallback(
    (id: string, action: FlashcardItemAction) => {
      setFlashcards((prev) =>
        prev.map((f) => {
          if (f.id !== id) return f;
          switch (action) {
            case "accept":
              return { ...f, status: "accepted" as const };
            case "reject":
              return { ...f, status: "rejected" as const };
            case "edit":
              return { ...f, status: "edited" as const };
            default:
              return f;
          }
        })
      );
    },
    []
  );

  const handleFlashcardUpdate = React.useCallback(
    (id: string, front: string, back: string) => {
      setFlashcards((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, front, back, status: "edited" as const } : f
        )
      );
    },
    []
  );

  const handleSave = React.useCallback(
    async (toSave: FlashcardCreateDto[]) => {
      if (toSave.length === 0) return;
      setApiError(null);
      const result = await createFlashcards(toSave);
      if (result.ok) {
        setFlashcards([]);
        setGenerationId(null);
        return;
      }
      const msg =
        result.error.message ??
        result.error.error ??
        "Błąd zapisu fiszek.";
      setApiError(msg);
    },
    []
  );

  const displayError = apiError ?? textError ?? null;

  return {
    text,
    setText,
    textError,
    validateText,
    handleBlur,
    flashcards,
    loading,
    apiError,
    handleGenerate,
    handleListAction,
    handleFlashcardUpdate,
    handleSave,
    displayError,
  };
}

export { useFlashcardGeneration };
