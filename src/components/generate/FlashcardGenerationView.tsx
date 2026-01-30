import * as React from "react";
import { Button } from "@/components/ui/button";
import { TextInputArea } from "./TextInputArea";
import { FlashcardList } from "./FlashcardList";
import { SkeletonLoader } from "./SkeletonLoader";
import { BulkSaveButton } from "./BulkSaveButton";
import { ErrorNotification } from "./ErrorNotification";
import { ManualFlashcardForm } from "./ManualFlashcardForm";
import { useFlashcardGeneration } from "@/components/hooks/useFlashcardGeneration";
import {
  TEXT_INPUT_MIN_LENGTH,
  TEXT_INPUT_MAX_LENGTH,
} from "./TextInputArea";

/**
 * Main view for generating flashcards from source text.
 * Delegates state and API logic to useFlashcardGeneration; renders UI.
 */
function FlashcardGenerationView() {
  const {
    text,
    setText,
    textError,
    handleBlur,
    flashcards,
    loading,
    handleGenerate,
    handleListAction,
    handleFlashcardUpdate,
    handleSave,
    displayError,
  } = useFlashcardGeneration();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Generuj fiszki</h1>
        <p className="text-muted-foreground">
          Wprowadź tekst (od {TEXT_INPUT_MIN_LENGTH} do {TEXT_INPUT_MAX_LENGTH}{" "}
          znaków), a następnie wygeneruj propozycje fiszek.
        </p>
      </header>

      <TextInputArea
        value={text}
        onChange={setText}
        error={textError ?? undefined}
        onBlur={handleBlur}
        disabled={loading}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          aria-label="Generuj fiszki na podstawie tekstu"
        >
          Generuj fiszki
        </Button>
      </div>

      <ManualFlashcardForm disabled={loading} />

      {displayError && <ErrorNotification errorMessage={displayError} />}

      {loading && <SkeletonLoader />}

      {!loading && flashcards.length > 0 && (
        <>
          <FlashcardList
            flashcards={flashcards}
            onAction={handleListAction}
            onUpdate={handleFlashcardUpdate}
          />
          <BulkSaveButton flashcards={flashcards} onSave={handleSave} />
        </>
      )}
    </div>
  );
}

export { FlashcardGenerationView };
export default FlashcardGenerationView;
