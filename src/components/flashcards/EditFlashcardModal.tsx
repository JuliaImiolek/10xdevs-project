import * as React from "react";
import type { FlashcardDto } from "@/types";
import { updateFlashcard } from "@/lib/flashcards-api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FRONT_MAX = 200;
const BACK_MAX = 500;
const SOURCE_OPTIONS: { value: "ai-edited" | "manual"; label: string }[] = [
  { value: "ai-edited", label: "AI (edycja)" },
  { value: "manual", label: "Ręcznie" },
];

export interface EditFlashcardModalProps {
  flashcard: FlashcardDto | null;
  onClose: () => void;
  onSaved: (updated: FlashcardDto) => void;
  onError: (message: string) => void;
}

interface FormErrors {
  front?: string;
  back?: string;
  source?: string;
}

function validate(
  front: string,
  back: string,
  source: "ai-edited" | "manual" | ""
): FormErrors {
  const errors: FormErrors = {};
  const f = front.trim();
  const b = back.trim();
  if (f.length === 0) errors.front = "Pole jest wymagane.";
  else if (f.length > FRONT_MAX) errors.front = `Maksymalnie ${FRONT_MAX} znaków.`;
  if (b.length === 0) errors.back = "Pole jest wymagane.";
  else if (b.length > BACK_MAX) errors.back = `Maksymalnie ${BACK_MAX} znaków.`;
  if (source !== "ai-edited" && source !== "manual") errors.source = "Wybierz źródło.";
  return errors;
}

export function EditFlashcardModal({
  flashcard,
  onClose,
  onSaved,
  onError,
}: EditFlashcardModalProps) {
  const [front, setFront] = React.useState("");
  const [back, setBack] = React.useState("");
  const [source, setSource] = React.useState<"ai-edited" | "manual">("manual");
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [submitting, setSubmitting] = React.useState(false);
  const dialogRef = React.useRef<HTMLDialogElement>(null);

  const open = flashcard != null;

  React.useEffect(() => {
    if (flashcard) {
      setFront(flashcard.front);
      setBack(flashcard.back);
      setSource(
        flashcard.source === "ai-edited" || flashcard.source === "manual"
          ? flashcard.source
          : "manual"
      );
      setErrors({});
    }
  }, [flashcard]);

  React.useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open) {
      el.showModal();
    } else {
      el.close();
    }
  }, [open]);

  const handleCancel = React.useCallback(() => {
    onClose();
  }, [onClose]);

  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const errs = validate(front, back, source);
      if (Object.keys(errs).length > 0) {
        setErrors(errs);
        return;
      }
      if (!flashcard) return;

      setSubmitting(true);
      setErrors({});

      const result = await updateFlashcard(flashcard.id, {
        front: front.trim(),
        back: back.trim(),
        source,
      });

      setSubmitting(false);

      if (result.ok) {
        onSaved(result.data);
        onClose();
        return;
      }

      const apiErr = result.error;
      if (apiErr.status === 400 && apiErr.details) {
        const fieldErrors: FormErrors = {};
        if (apiErr.details.front?.[0]) fieldErrors.front = apiErr.details.front[0];
        if (apiErr.details.back?.[0]) fieldErrors.back = apiErr.details.back[0];
        if (apiErr.details.source?.[0]) fieldErrors.source = apiErr.details.source[0];
        setErrors(fieldErrors);
        return;
      }
      if (apiErr.status === 404) {
        onError("Fiszka nie została znaleziona.");
        onClose();
        return;
      }
      onError(apiErr.message ?? "Wystąpił błąd. Spróbuj ponownie.");
    },
    [front, back, source, flashcard, onSaved, onClose, onError]
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    },
    [handleCancel]
  );

  if (!flashcard) return null;

  const inputBase =
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

  return (
    <dialog
      ref={dialogRef}
      onKeyDown={handleKeyDown}
      className="rounded-lg border bg-background p-6 shadow-lg backdrop:bg-black/50 max-w-md w-[calc(100%-2rem)]"
      aria-labelledby="edit-flashcard-title"
      aria-modal="true"
    >
      <h2 id="edit-flashcard-title" className="text-lg font-semibold mb-4">
        Edycja fiszki
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="edit-front" className="block text-sm font-medium mb-1">
            Przód
          </label>
          <input
            id="edit-front"
            type="text"
            value={front}
            onChange={(e) => setFront(e.target.value)}
            maxLength={FRONT_MAX + 1}
            disabled={submitting}
            className={cn(inputBase, errors.front && "border-destructive")}
            aria-invalid={!!errors.front}
            aria-describedby={errors.front ? "edit-front-error" : undefined}
          />
          {errors.front && (
            <p id="edit-front-error" className="text-sm text-destructive mt-1" role="alert">
              {errors.front}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="edit-back" className="block text-sm font-medium mb-1">
            Tył
          </label>
          <textarea
            id="edit-back"
            value={back}
            onChange={(e) => setBack(e.target.value)}
            maxLength={BACK_MAX + 1}
            rows={4}
            disabled={submitting}
            className={cn(inputBase, errors.back && "border-destructive")}
            aria-invalid={!!errors.back}
            aria-describedby={errors.back ? "edit-back-error" : undefined}
          />
          {errors.back && (
            <p id="edit-back-error" className="text-sm text-destructive mt-1" role="alert">
              {errors.back}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="edit-source" className="block text-sm font-medium mb-1">
            Źródło
          </label>
          <select
            id="edit-source"
            value={source}
            onChange={(e) => setSource(e.target.value as "ai-edited" | "manual")}
            disabled={submitting}
            className={cn(inputBase, errors.source && "border-destructive")}
            aria-invalid={!!errors.source}
            aria-describedby={errors.source ? "edit-source-error" : undefined}
          >
            {SOURCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {errors.source && (
            <p id="edit-source-error" className="text-sm text-destructive mt-1" role="alert">
              {errors.source}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={handleCancel} disabled={submitting}>
            Anuluj
          </Button>
          <Button type="submit" disabled={submitting}>
            Zapisz
          </Button>
        </div>
      </form>
    </dialog>
  );
}
