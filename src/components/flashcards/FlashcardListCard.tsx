import * as React from "react";
import type { FlashcardDto } from "@/types";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SOURCE_LABELS: Record<string, string> = {
  manual: "Ręcznie",
  "ai-full": "AI (pełne)",
  "ai-edited": "AI (edycja)",
};

function getSourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}

export interface FlashcardListCardProps {
  flashcard: FlashcardDto;
  onEdit: (f: FlashcardDto) => void;
  onDelete: (f: FlashcardDto) => void;
}

export function FlashcardListCard({
  flashcard,
  onEdit,
  onDelete,
}: FlashcardListCardProps) {
  const handleEdit = React.useCallback(() => {
    onEdit(flashcard);
  }, [flashcard, onEdit]);

  const handleDelete = React.useCallback(() => {
    onDelete(flashcard);
  }, [flashcard, onDelete]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <span
          className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
          aria-label="Źródło fiszki"
        >
          {getSourceLabel(flashcard.source)}
        </span>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm font-medium leading-tight" title={flashcard.front}>
          {flashcard.front.length > 120
            ? `${flashcard.front.slice(0, 120)}…`
            : flashcard.front}
        </p>
        <p
          className="text-sm text-muted-foreground leading-snug line-clamp-2"
          title={flashcard.back}
        >
          {flashcard.back.length > 150
            ? `${flashcard.back.slice(0, 150)}…`
            : flashcard.back}
        </p>
      </CardContent>
      <CardFooter className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleEdit}
          aria-label={`Edycja fiszki: ${flashcard.front.slice(0, 30)}`}
        >
          Edycja
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          aria-label={`Usuń fiszkę: ${flashcard.front.slice(0, 30)}`}
        >
          Usuń
        </Button>
      </CardFooter>
    </Card>
  );
}
