/**
 * Client-side validation for edit flashcard form (PUT /api/flashcards/{id}).
 * Rules: front 1–200 chars, back 1–500 chars, source "ai-edited" | "manual".
 */
export const FRONT_MAX = 200;
export const BACK_MAX = 500;

export interface EditFlashcardFormErrors {
  front?: string;
  back?: string;
  source?: string;
}

export function validateEditFlashcardForm(
  front: string,
  back: string,
  source: "ai-edited" | "manual" | ""
): EditFlashcardFormErrors {
  const errors: EditFlashcardFormErrors = {};
  const f = front.trim();
  const b = back.trim();
  if (f.length === 0) errors.front = "Pole jest wymagane.";
  else if (f.length > FRONT_MAX) errors.front = `Maksymalnie ${FRONT_MAX} znaków.`;
  if (b.length === 0) errors.back = "Pole jest wymagane.";
  else if (b.length > BACK_MAX) errors.back = `Maksymalnie ${BACK_MAX} znaków.`;
  if (source !== "ai-edited" && source !== "manual") errors.source = "Wybierz źródło.";
  return errors;
}
