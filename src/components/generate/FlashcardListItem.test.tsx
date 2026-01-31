import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FlashcardListItem } from "./FlashcardListItem";
import type { FlashcardViewModel } from "@/types";

function makeFlashcard(
  overrides: Partial<FlashcardViewModel> & { id: string }
): FlashcardViewModel {
  return {
    id: overrides.id,
    front: "Przód",
    back: "Tył",
    source: "ai-full",
    generation_id: 1,
    status: "pending",
    ...overrides,
  };
}

describe("FlashcardListItem", () => {
  it("wywołuje onAction('accept') po kliknięciu Akceptuj", () => {
    const onAction = vi.fn();
    render(
      <FlashcardListItem
        flashcard={makeFlashcard({ id: "1" })}
        onAction={onAction}
        onUpdate={vi.fn()}
      />
    );
    fireEvent.click(
      screen.getByRole("button", { name: /zaakceptuj fiszkę/i })
    );
    expect(onAction).toHaveBeenCalledWith("accept");
  });

  it("wywołuje onAction('reject') po kliknięciu Odrzuć", () => {
    const onAction = vi.fn();
    render(
      <FlashcardListItem
        flashcard={makeFlashcard({ id: "1" })}
        onAction={onAction}
        onUpdate={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /odrzuć fiszkę/i }));
    expect(onAction).toHaveBeenCalledWith("reject");
  });

  it("wywołuje onAction('edit') po kliknięciu Edytuj", () => {
    const onAction = vi.fn();
    render(
      <FlashcardListItem
        flashcard={makeFlashcard({ id: "1" })}
        onAction={onAction}
        onUpdate={vi.fn()}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /edytuj fiszkę/i }));
    expect(onAction).toHaveBeenCalledWith("edit");
  });

  it("przy status edited i pustym przodzie Zapisz jest disabled", () => {
    const onUpdate = vi.fn();
    render(
      <FlashcardListItem
        flashcard={makeFlashcard({ id: "1", status: "edited" })}
        onAction={vi.fn()}
        onUpdate={onUpdate}
      />
    );
    const textareas = screen.getAllByRole("textbox");
    fireEvent.change(textareas[0], { target: { value: "" } });
    fireEvent.blur(textareas[0]);
    const saveBtn = screen.getByRole("button", { name: /zapisz zmiany/i });
    expect(saveBtn).toBeDisabled();
  });

  it("po edycji wywołuje onUpdate z trimowanymi wartościami", () => {
    const onUpdate = vi.fn();
    render(
      <FlashcardListItem
        flashcard={makeFlashcard({
          id: "1",
          status: "edited",
          front: "Stary",
          back: "Stary tył",
        })}
        onAction={vi.fn()}
        onUpdate={onUpdate}
      />
    );
    const textareas = screen.getAllByRole("textbox");
    fireEvent.change(textareas[0], { target: { value: "  Nowy przód  " } });
    fireEvent.change(textareas[1], { target: { value: "  Nowy tył  " } });
    fireEvent.click(screen.getByRole("button", { name: /zapisz zmiany/i }));
    expect(onUpdate).toHaveBeenCalledWith("Nowy przód", "Nowy tył");
  });

  it("przy status rejected przycisk Odrzuć jest disabled", () => {
    render(
      <FlashcardListItem
        flashcard={makeFlashcard({ id: "1", status: "rejected" })}
        onAction={vi.fn()}
        onUpdate={vi.fn()}
      />
    );
    expect(
      screen.getByRole("button", { name: /odrzuć fiszkę/i })
    ).toBeDisabled();
  });
});
