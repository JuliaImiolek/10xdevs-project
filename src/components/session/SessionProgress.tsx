import * as React from "react";

export interface SessionProgressProps {
  /** Pozycja bieżąca (1-based). */
  currentIndex: number;
  /** Łączna liczba fiszek w sesji. */
  total: number;
}

/**
 * Wyświetla licznik postępu sesji: „Fiszka X z Y”.
 * Używany tylko gdy total >= 1 i sesja nie jest zakończona.
 */
export function SessionProgress({ currentIndex, total }: SessionProgressProps) {
  if (total < 1) {
    return null;
  }

  return (
    <div
      className="text-sm font-medium text-muted-foreground"
      role="status"
      aria-live="polite"
      aria-label={`Fiszka ${currentIndex} z ${total}`}
    >
      Fiszka {currentIndex} z {total}
    </div>
  );
}
