import * as React from "react";
import { Button } from "@/components/ui/button";
import type { FlashcardViewModel } from "@/types";
import type { FlashcardCreateDto } from "@/types";
import { cn } from "@/lib/utils";

interface BulkSaveButtonProps {
  flashcards: FlashcardViewModel[];
  onSave: (flashcards: FlashcardCreateDto[]) => void;
  className?: string;
}

/**
 * Maps view model to API DTO; source "ai-edited" when user edited the card.
 */
function toCreateDtos(list: FlashcardViewModel[]): FlashcardCreateDto[] {
  return list.map((f) => ({
    front: f.front,
    back: f.back,
    source: f.status === "edited" ? "ai-edited" : f.source,
    generation_id: f.generation_id,
  }));
}

/**
 * Buttons to save all non-rejected flashcards or only accepted/edited ones.
 * - "Zapisz zaakceptowane" = only accepted + edited (excludes pending, rejected).
 * - "Zapisz wszystkie" = all except rejected (pending + accepted + edited).
 * Rejected cards are never sent to the API.
 */
function BulkSaveButton({ flashcards, onSave, className }: BulkSaveButtonProps) {
  const accepted = React.useMemo(
    () =>
      flashcards.filter(
        (f) => f.status === "accepted" || f.status === "edited"
      ),
    [flashcards]
  );
  const notRejected = React.useMemo(
    () => flashcards.filter((f) => f.status !== "rejected"),
    [flashcards]
  );
  const hasAccepted = accepted.length > 0;
  const hasAnyToSave = notRejected.length > 0;
  const hasAny = flashcards.length > 0;

  const handleSaveAll = React.useCallback(() => {
    onSave(toCreateDtos(notRejected));
  }, [notRejected, onSave]);

  const handleSaveAccepted = React.useCallback(() => {
    onSave(toCreateDtos(accepted));
  }, [accepted, onSave]);

  if (!hasAny) return null;

  return (
    <div
      className={cn("flex flex-wrap gap-2", className)}
      role="group"
      aria-label="Zapis fiszek"
    >
      <Button
        type="button"
        onClick={handleSaveAccepted}
        disabled={!hasAccepted}
        aria-label="Zapisz tylko zaakceptowane fiszki"
      >
        Zapisz zaakceptowane ({accepted.length})
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={handleSaveAll}
        disabled={!hasAnyToSave}
        aria-label="Zapisz wszystkie fiszki (bez odrzuconych)"
      >
        Zapisz wszystkie ({notRejected.length})
      </Button>
    </div>
  );
}

export { BulkSaveButton };
