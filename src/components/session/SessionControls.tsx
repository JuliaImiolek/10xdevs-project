import * as React from "react";
import type { SessionGrade } from "@/types";
import {
  SESSION_GRADE_AGAIN,
  SESSION_GRADE_GOOD,
  SESSION_GRADE_EASY,
} from "@/types";
import { Button } from "@/components/ui/button";

export interface SessionControlsProps {
  revealed: boolean;
  onReveal: () => void;
  onRate: (grade: SessionGrade) => void;
  onSkip?: () => void;
  disabled?: boolean;
}

const GRADE_LABELS: Record<SessionGrade, string> = {
  [SESSION_GRADE_AGAIN]: "Źle",
  [SESSION_GRADE_GOOD]: "Średnio",
  [SESSION_GRADE_EASY]: "Dobrze",
};

/**
 * Przycisk „Pokaż odpowiedź” (gdy !revealed); po odsłonięciu — przyciski oceny (Źle / Średnio / Dobrze) i opcjonalnie „Pomiń”.
 */
export function SessionControls({
  revealed,
  onReveal,
  onRate,
  onSkip,
  disabled = false,
}: SessionControlsProps) {
  const handleReveal = React.useCallback(() => {
    onReveal();
  }, [onReveal]);

  const handleRate = React.useCallback(
    (grade: SessionGrade) => () => {
      onRate(grade);
    },
    [onRate]
  );

  const handleSkip = React.useCallback(() => {
    onSkip?.();
  }, [onSkip]);

  if (!revealed) {
    return (
      <div className="flex justify-center">
        <Button
          type="button"
          size="lg"
          onClick={handleReveal}
          disabled={disabled}
          aria-label="Pokaż odpowiedź"
        >
          Pokaż odpowiedź
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {Object.entries(GRADE_LABELS).map(([gradeStr, label]) => {
        const grade = Number(gradeStr) as SessionGrade;
        return (
          <Button
            key={grade}
            type="button"
            variant="outline"
            size="lg"
            onClick={handleRate(grade)}
            disabled={disabled}
            aria-label={`Oceń: ${label}`}
          >
            {label}
          </Button>
        );
      })}
      {onSkip != null && (
        <Button
          type="button"
          variant="ghost"
          size="lg"
          onClick={handleSkip}
          disabled={disabled}
          aria-label="Pomiń fiszkę"
        >
          Pomiń
        </Button>
      )}
    </div>
  );
}
