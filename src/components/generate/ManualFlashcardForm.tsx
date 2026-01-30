import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createFlashcards } from "@/lib/flashcards-api";
import { cn } from "@/lib/utils";

/** Max characters for front (przód). Matches API validation. */
export const MANUAL_FRONT_MAX = 200;
/** Max characters for back (tył). Matches API validation. */
export const MANUAL_BACK_MAX = 500;

export interface ManualFlashcardFormProps {
  /** Called after a flashcard was successfully created. */
  onSuccess?: () => void;
  /** Called when API or validation error occurs (optional; form also shows inline error). */
  onError?: (message: string) => void;
  /** Disable form (e.g. while another operation is in progress). */
  disabled?: boolean;
  className?: string;
}

interface FormErrors {
  front?: string;
  back?: string;
}

function validate(front: string, back: string): FormErrors {
  const errors: FormErrors = {};
  const f = front.trim();
  const b = back.trim();
  if (f.length === 0) {
    errors.front = "Pole jest wymagane.";
  } else if (f.length > MANUAL_FRONT_MAX) {
    errors.front = `Maksymalnie ${MANUAL_FRONT_MAX} znaków.`;
  }
  if (b.length === 0) {
    errors.back = "Pole jest wymagane.";
  } else if (b.length > MANUAL_BACK_MAX) {
    errors.back = `Maksymalnie ${MANUAL_BACK_MAX} znaków.`;
  }
  return errors;
}

/**
 * Form for manually creating a single flashcard (US-002).
 * Two fields: front (przód) and back (tył) with character limits.
 * On submit, validates and POSTs to /api/flashcards; on success clears form and calls onSuccess.
 */
function ManualFlashcardForm({
  onSuccess,
  onError,
  disabled = false,
  className,
}: ManualFlashcardFormProps) {
  const [front, setFront] = React.useState("");
  const [back, setBack] = React.useState("");
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const successTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const frontId = React.useId();
  const backId = React.useId();
  const frontErrorId = `${frontId}-error`;
  const backErrorId = `${backId}-error`;
  const formDisabled = disabled || submitting;

  React.useEffect(() => {
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitError(null);
      setSuccessMessage(null);
      const errs = validate(front, back);
      if (Object.keys(errs).length > 0) {
        setErrors(errs);
        return;
      }

      setSubmitting(true);
      setErrors({});

      const result = await createFlashcards([
        {
          front: front.trim(),
          back: back.trim(),
          source: "manual",
          generation_id: null,
        },
      ]);

      setSubmitting(false);

      if (result.ok) {
        setFront("");
        setBack("");
        const message = "Fiszka została zapisana.";
        setSuccessMessage(message);
        if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
        successTimeoutRef.current = setTimeout(() => setSuccessMessage(null), 3000);
        onSuccess?.();
        return;
      }

      const apiErr = result.error;
      if (apiErr.status === 400 && apiErr.details) {
        const fieldErrors: FormErrors = {};
        if (apiErr.details.front?.[0]) fieldErrors.front = apiErr.details.front[0];
        if (apiErr.details.back?.[0]) fieldErrors.back = apiErr.details.back[0];
        if (Object.keys(fieldErrors).length > 0) {
          setErrors(fieldErrors);
          return;
        }
      }
      const message = apiErr.message ?? apiErr.error ?? "Wystąpił błąd. Spróbuj ponownie.";
      setSubmitError(message);
      onError?.(message);
    },
    [front, back, onSuccess, onError]
  );

  return (
    <section
      className={cn("space-y-4", className)}
      aria-labelledby="manual-flashcard-heading"
    >
      <h2 id="manual-flashcard-heading" className="text-lg font-semibold">
        Ręcznie dodaj fiszkę
      </h2>
      <p className="text-sm text-muted-foreground">
        Wypełnij pola „przód” i „tył”. Po zatwierdzeniu fiszka zostanie zapisana
        i będzie dostępna na liście fiszek.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={frontId}>
            Przód
          </Label>
          <Input
            id={frontId}
            type="text"
            value={front}
            onChange={(e) => setFront(e.target.value)}
            maxLength={MANUAL_FRONT_MAX + 1}
            disabled={formDisabled}
            className={cn(errors.front && "border-destructive")}
            aria-invalid={!!errors.front}
            aria-describedby={errors.front ? frontErrorId : undefined}
            placeholder="Treść strony przedniej fiszki"
          />
          <p className="text-xs text-muted-foreground">
            {front.length} / {MANUAL_FRONT_MAX} znaków
          </p>
          {errors.front && (
            <p
              id={frontErrorId}
              className="text-sm text-destructive"
              role="alert"
            >
              {errors.front}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor={backId}>
            Tył
          </Label>
          <Textarea
            id={backId}
            value={back}
            onChange={(e) => setBack(e.target.value)}
            maxLength={MANUAL_BACK_MAX + 1}
            rows={4}
            disabled={formDisabled}
            className={cn(errors.back && "border-destructive")}
            aria-invalid={!!errors.back}
            aria-describedby={errors.back ? backErrorId : undefined}
            placeholder="Treść strony tylnej fiszki"
          />
          <p className="text-xs text-muted-foreground">
            {back.length} / {MANUAL_BACK_MAX} znaków
          </p>
          {errors.back && (
            <p
              id={backErrorId}
              className="text-sm text-destructive"
              role="alert"
            >
              {errors.back}
            </p>
          )}
        </div>
        {successMessage && (
          <p
            className="text-sm text-green-600 dark:text-green-400"
            role="status"
            aria-live="polite"
          >
            {successMessage}
          </p>
        )}
        {submitError && (
          <p className="text-sm text-destructive" role="alert">
            {submitError}
          </p>
        )}
        <Button
          type="submit"
          disabled={formDisabled}
          aria-label="Zapisz fiszkę"
        >
          {submitting ? "Zapisywanie…" : "Dodaj fiszkę"}
        </Button>
      </form>
    </section>
  );
}

export { ManualFlashcardForm };
