import * as React from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface SessionSummaryProps {
  /** Liczba powtórzonych fiszek. */
  totalReviewed: number;
  onRestart: () => void;
}

/**
 * Wyświetlany po zakończeniu sesji: komunikat podsumowujący oraz przyciski „Rozpocznij ponownie” i „Wróć do listy fiszek”.
 */
export function SessionSummary({
  totalReviewed,
  onRestart,
}: SessionSummaryProps) {
  const handleRestart = React.useCallback(() => {
    onRestart();
  }, [onRestart]);

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold">Sesja zakończona</h2>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          Powtórzono {totalReviewed} {totalReviewed === 1 ? "fiszkę" : totalReviewed < 5 ? "fiszki" : "fiszek"}.
        </p>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={handleRestart}
          aria-label="Rozpocznij sesję ponownie"
        >
          Rozpocznij ponownie
        </Button>
        <Button
          type="button"
          variant="outline"
          asChild
          aria-label="Wróć do listy fiszek"
        >
          <a href="/flashcards">Wróć do listy fiszek</a>
        </Button>
      </CardFooter>
    </Card>
  );
}
