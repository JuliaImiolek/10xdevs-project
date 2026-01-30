import * as React from "react";
import type { FlashcardDto } from "@/types";
import { Button } from "@/components/ui/button";

export interface DeleteConfirmDialogProps {
  flashcard: FlashcardDto | null;
  onClose: () => void;
  onConfirm: (id: number) => void;
  loading?: boolean;
}

export function DeleteConfirmDialog({
  flashcard,
  onClose,
  onConfirm,
  loading = false,
}: DeleteConfirmDialogProps) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const open = flashcard != null;

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

  const handleConfirm = React.useCallback(() => {
    if (flashcard) {
      onConfirm(flashcard.id);
    }
  }, [flashcard, onConfirm]);

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

  return (
    <dialog
      ref={dialogRef}
      onKeyDown={handleKeyDown}
      className="rounded-lg border bg-background p-6 shadow-lg backdrop:bg-black/50 max-w-sm w-[calc(100%-2rem)]"
      aria-labelledby="delete-dialog-title"
      aria-describedby="delete-dialog-desc"
      aria-modal="true"
    >
      <h2 id="delete-dialog-title" className="text-lg font-semibold">
        Usuń fiszkę
      </h2>
      <p id="delete-dialog-desc" className="text-muted-foreground text-sm mt-2">
        Czy na pewno chcesz usunąć tę fiszkę? Tej operacji nie można cofnąć.
      </p>
      <div className="flex justify-end gap-2 mt-6">
        <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
          Anuluj
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={handleConfirm}
          disabled={loading}
          aria-label="Potwierdź usunięcie fiszki"
        >
          Usuń
        </Button>
      </div>
    </dialog>
  );
}
