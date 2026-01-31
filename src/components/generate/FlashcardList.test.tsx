import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FlashcardList } from "./FlashcardList";
import type { FlashcardViewModel } from "@/types";

function makeFlashcard(
  id: string,
  overrides?: Partial<FlashcardViewModel>
): FlashcardViewModel {
  return {
    id,
    front: "F",
    back: "B",
    source: "ai-full",
    generation_id: 1,
    status: "pending",
    ...overrides,
  };
}

describe("FlashcardList", () => {
  it("zwraca null gdy flashcards.length === 0", () => {
    const { container } = render(
      <FlashcardList flashcards={[]} onAction={vi.fn()} onUpdate={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renderuje sekcję z listą fiszek", () => {
    const list: FlashcardViewModel[] = [
      makeFlashcard("gen-1-0"),
      makeFlashcard("gen-1-1"),
    ];
    render(
      <FlashcardList
        flashcards={list}
        onAction={vi.fn()}
        onUpdate={vi.fn()}
      />
    );
    const section = screen.getByRole("region", {
      name: /lista propozycji fiszek/i,
    });
    expect(section).toBeInTheDocument();
    expect(screen.getByText("Propozycje fiszek")).toBeInTheDocument();
  });

  it("wywołuje onAction z id i akcją przy Akceptuj", () => {
    const onAction = vi.fn();
    const list: FlashcardViewModel[] = [makeFlashcard("gen-1-0")];
    render(
      <FlashcardList
        flashcards={list}
        onAction={onAction}
        onUpdate={vi.fn()}
      />
    );
    const acceptBtn = screen.getByRole("button", {
      name: /zaakceptuj fiszkę/i,
    });
    fireEvent.click(acceptBtn);
    expect(onAction).toHaveBeenCalledWith("gen-1-0", "accept");
  });

  it("wywołuje onUpdate z id, front, back przy Zapisz zmiany", () => {
    const onUpdate = vi.fn();
    const list: FlashcardViewModel[] = [
      makeFlashcard("gen-1-0", { status: "edited" }),
    ];
    render(
      <FlashcardList
        flashcards={list}
        onAction={vi.fn()}
        onUpdate={onUpdate}
      />
    );
    const saveBtn = screen.getByRole("button", { name: /zapisz zmiany/i });
    fireEvent.click(saveBtn);
    expect(onUpdate).toHaveBeenCalledWith("gen-1-0", "F", "B");
  });
});
