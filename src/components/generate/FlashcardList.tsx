import * as React from "react";
import { FlashcardListItem, type FlashcardItemAction } from "./FlashcardListItem";
import type { FlashcardViewModel } from "@/types";
import { cn } from "@/lib/utils";

interface FlashcardListProps {
  flashcards: FlashcardViewModel[];
  onAction: (id: string, action: FlashcardItemAction) => void;
  onUpdate: (id: string, front: string, back: string) => void;
  className?: string;
}

/**
 * Renders the list of generated flashcards; forwards actions and updates to parent.
 */
function FlashcardList({
  flashcards,
  onAction,
  onUpdate,
  className,
}: FlashcardListProps) {
  const handleAction = React.useCallback(
    (id: string) => (action: FlashcardItemAction) => {
      onAction(id, action);
    },
    [onAction]
  );

  if (flashcards.length === 0) return null;

  return (
    <section
      className={cn("space-y-4", className)}
      aria-label="Lista propozycji fiszek"
    >
      <h2 className="text-lg font-semibold">Propozycje fiszek</h2>
      <ul className="list-none space-y-4 p-0">
        {flashcards.map((fc) => (
          <li key={fc.id}>
            <FlashcardListItem
              flashcard={fc}
              onAction={handleAction(fc.id)}
              onUpdate={(front, back) => onUpdate(fc.id, front, back)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

export { FlashcardList };
