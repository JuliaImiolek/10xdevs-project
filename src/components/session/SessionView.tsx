import * as React from "react";
import type { SessionGrade } from "@/types";
import { useSessionFlashcards } from "@/components/hooks/useSessionFlashcards";
import { SessionProgress } from "./SessionProgress";
import { SessionCard } from "./SessionCard";
import { SessionControls } from "./SessionControls";
import { SessionSummary } from "./SessionSummary";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const SESSION_ERROR_UNAUTHORIZED = "Sesja wygasła. Zaloguj się ponownie.";

function SessionSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-5 w-32" />
      <div className="rounded-xl border py-6 shadow-sm">
        <div className="space-y-2 px-6">
          <Skeleton className="h-6 w-full max-w-md" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="mt-6 flex justify-center px-6">
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
    </div>
  );
}

export default function SessionView() {
  const { data: cards, loading, error, refetch } = useSessionFlashcards();

  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [revealed, setRevealed] = React.useState(false);
  const [sessionEnded, setSessionEnded] = React.useState(false);

  const handleReveal = React.useCallback(() => {
    setRevealed(true);
  }, []);

  const handleRate = React.useCallback((_grade: SessionGrade) => {
    setRevealed(false);
    setCurrentIndex((prev) => {
      const next = prev + 1;
      if (next >= cards.length) {
        setSessionEnded(true);
      }
      return next;
    });
  }, [cards.length]);

  const handleSkip = React.useCallback(() => {
    setRevealed(false);
    setCurrentIndex((prev) => {
      const next = prev + 1;
      if (next >= cards.length) {
        setSessionEnded(true);
      }
      return next;
    });
  }, [cards.length]);

  const handleRestart = React.useCallback(() => {
    setCurrentIndex(0);
    setRevealed(false);
    setSessionEnded(false);
  }, []);

  const handleRetry = React.useCallback(async () => {
    await refetch();
  }, [refetch]);

  if (loading) {
    return (
      <main role="main" aria-label="Sesja powtórek" className="space-y-6">
        <h1 className="text-2xl font-semibold">Sesja powtórek</h1>
        <SessionSkeleton />
      </main>
    );
  }

  if (error) {
    const isUnauthorized = error === SESSION_ERROR_UNAUTHORIZED;
    return (
      <main role="main" aria-label="Sesja powtórek" className="space-y-6">
        <h1 className="text-2xl font-semibold">Sesja powtórek</h1>
        <div
          className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          <p>{error}</p>
          {isUnauthorized && (
            <p className="mt-2">
              <a href="/auth/login" className="underline hover:no-underline">
                Zaloguj się
              </a>
            </p>
          )}
          {!isUnauthorized && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={handleRetry}
              aria-label="Spróbuj ponownie"
            >
              Spróbuj ponownie
            </Button>
          )}
        </div>
      </main>
    );
  }

  if (cards.length === 0) {
    return (
      <main role="main" aria-label="Sesja powtórek" className="space-y-6">
        <h1 className="text-2xl font-semibold">Sesja powtórek</h1>
        <p className="text-muted-foreground text-center py-8">
          Brak fiszek do powtórzenia. Dodaj fiszki w{" "}
          <a href="/flashcards" className="text-primary underline hover:no-underline">
            Moje fiszki
          </a>
          .
        </p>
      </main>
    );
  }

  if (sessionEnded) {
    return (
      <main role="main" aria-label="Sesja powtórek" className="space-y-6">
        <h1 className="text-2xl font-semibold">Sesja powtórek</h1>
        <SessionSummary totalReviewed={cards.length} onRestart={handleRestart} />
      </main>
    );
  }

  const currentCard = cards[currentIndex];
  if (currentCard == null) {
    return null;
  }

  return (
    <main role="main" aria-label="Sesja powtórek" className="space-y-6">
      <h1 className="text-2xl font-semibold">Sesja powtórek</h1>

      <SessionProgress
        currentIndex={currentIndex + 1}
        total={cards.length}
      />

      <SessionCard flashcard={currentCard} revealed={revealed} />

      <SessionControls
        revealed={revealed}
        onReveal={handleReveal}
        onRate={handleRate}
        onSkip={handleSkip}
        disabled={false}
      />
    </main>
  );
}
