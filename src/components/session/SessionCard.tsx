import * as React from "react";
import type { FlashcardDto } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export interface SessionCardProps {
  flashcard: FlashcardDto;
  /** Czy tył fiszki jest odsłonięty. */
  revealed: boolean;
}

/**
 * Wyświetla jedną fiszkę: przód zawsze widoczny, tył tylko gdy revealed === true.
 * Długie teksty: max-height + overflow-y-auto.
 */
export const SessionCard = React.memo(function SessionCard({
  flashcard,
  revealed,
}: SessionCardProps) {
  return (
    <Card className="min-h-[8rem]">
      <CardHeader className="pb-2">
        <p
          className="text-base font-semibold leading-snug"
          aria-label="Przód fiszki"
        >
          {flashcard.front}
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {revealed && (
          <div
            className="max-h-32 overflow-y-auto rounded-md border bg-muted/50 px-3 py-2 text-sm text-muted-foreground"
            aria-label="Tył fiszki"
          >
            {flashcard.back}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
