import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import type { FlashcardViewModel } from "@/types";
import { cn } from "@/lib/utils";

export type FlashcardItemAction = "accept" | "edit" | "reject";

const FRONT_MAX_LENGTH = 200;
const BACK_MAX_LENGTH = 500;

interface FlashcardListItemProps {
  flashcard: FlashcardViewModel;
  onAction: (action: FlashcardItemAction) => void;
  onUpdate: (front: string, back: string) => void;
  className?: string;
}

/**
 * Single flashcard in the list with front/back, accept/edit/reject actions,
 * and inline editing with validation (front max 200, back max 500).
 */
function FlashcardListItem({
  flashcard,
  onAction,
  onUpdate,
  className,
}: FlashcardListItemProps) {
  const [editFront, setEditFront] = React.useState(flashcard.front);
  const [editBack, setEditBack] = React.useState(flashcard.back);
  const [frontError, setFrontError] = React.useState<string | null>(null);
  const [backError, setBackError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setEditFront(flashcard.front);
    setEditBack(flashcard.back);
  }, [flashcard.front, flashcard.back]);

  const handleAccept = React.useCallback(() => onAction("accept"), [onAction]);
  const handleEdit = React.useCallback(() => onAction("edit"), [onAction]);
  const handleReject = React.useCallback(() => onAction("reject"), [onAction]);

  const validateEdit = React.useCallback((): boolean => {
    const f = editFront.trim();
    const b = editBack.trim();
    let valid = true;
    if (f.length === 0) {
      setFrontError("Pole nie może być puste.");
      valid = false;
    } else if (f.length > FRONT_MAX_LENGTH) {
      setFrontError(`Maksymalnie ${FRONT_MAX_LENGTH} znaków (aktualnie: ${f.length}).`);
      valid = false;
    } else {
      setFrontError(null);
    }
    if (b.length === 0) {
      setBackError("Pole nie może być puste.");
      valid = false;
    } else if (b.length > BACK_MAX_LENGTH) {
      setBackError(`Maksymalnie ${BACK_MAX_LENGTH} znaków (aktualnie: ${b.length}).`);
      valid = false;
    } else {
      setBackError(null);
    }
    return valid;
  }, [editFront, editBack]);

  const handleSaveEdit = React.useCallback(() => {
    if (!validateEdit()) return;
    onUpdate(editFront.trim(), editBack.trim());
  }, [editFront, editBack, onUpdate, validateEdit]);

  const isEditing = flashcard.status === "edited";

  return (
    <Card
      className={cn(
        flashcard.status === "rejected" && "opacity-60",
        className
      )}
      data-status={flashcard.status}
    >
      <CardHeader className="pb-2">
        <p className="text-muted-foreground text-xs">
          Status: {flashcard.status}
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        <div>
          <span className="text-muted-foreground text-xs">Przód: </span>
          {isEditing ? (
            <div className="mt-1 space-y-1">
              <textarea
                value={editFront}
                onChange={(e) => setEditFront(e.target.value)}
                onBlur={() => {
                  const f = editFront.trim();
                  if (f.length === 0) setFrontError("Pole nie może być puste.");
                  else if (f.length > FRONT_MAX_LENGTH)
                    setFrontError(
                      `Maksymalnie ${FRONT_MAX_LENGTH} znaków (aktualnie: ${f.length}).`
                    );
                  else setFrontError(null);
                }}
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 aria-invalid:border-destructive"
                aria-invalid={Boolean(frontError)}
                aria-describedby={frontError ? `${flashcard.id}-front-error` : undefined}
              />
              {frontError && (
                <p
                  id={`${flashcard.id}-front-error`}
                  role="alert"
                  className="text-destructive text-xs"
                >
                  {frontError}
                </p>
              )}
              <p className="text-muted-foreground text-xs">
                {editFront.length} / {FRONT_MAX_LENGTH} znaków
              </p>
            </div>
          ) : (
            <p className="text-sm">{flashcard.front}</p>
          )}
        </div>
        <div>
          <span className="text-muted-foreground text-xs">Tył: </span>
          {isEditing ? (
            <div className="mt-1 space-y-1">
              <textarea
                value={editBack}
                onChange={(e) => setEditBack(e.target.value)}
                onBlur={() => {
                  const b = editBack.trim();
                  if (b.length === 0) setBackError("Pole nie może być puste.");
                  else if (b.length > BACK_MAX_LENGTH)
                    setBackError(
                      `Maksymalnie ${BACK_MAX_LENGTH} znaków (aktualnie: ${b.length}).`
                    );
                  else setBackError(null);
                }}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 aria-invalid:border-destructive"
                aria-invalid={Boolean(backError)}
                aria-describedby={backError ? `${flashcard.id}-back-error` : undefined}
              />
              {backError && (
                <p
                  id={`${flashcard.id}-back-error`}
                  role="alert"
                  className="text-destructive text-xs"
                >
                  {backError}
                </p>
              )}
              <p className="text-muted-foreground text-xs">
                {editBack.length} / {BACK_MAX_LENGTH} znaków
              </p>
            </div>
          ) : (
            <p className="text-sm">{flashcard.back}</p>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 border-t pt-4">
        <Button
          type="button"
          size="sm"
          variant="default"
          onClick={handleAccept}
          disabled={flashcard.status === "accepted"}
          aria-label="Zaakceptuj fiszkę"
        >
          Akceptuj
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleEdit}
          aria-label="Edytuj fiszkę"
        >
          Edytuj
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={handleReject}
          disabled={flashcard.status === "rejected"}
          aria-label="Odrzuć fiszkę"
        >
          Odrzuć
        </Button>
        {isEditing && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleSaveEdit}
            disabled={Boolean(frontError || backError)}
            aria-label="Zapisz zmiany"
          >
            Zapisz
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export { FlashcardListItem };
