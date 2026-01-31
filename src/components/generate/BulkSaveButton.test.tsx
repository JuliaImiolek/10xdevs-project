import { describe, expect, it, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { BulkSaveButton } from "./BulkSaveButton";
import type { FlashcardViewModel } from "@/types";

function makeFlashcard(
  overrides: Partial<FlashcardViewModel> & { id: string }
): FlashcardViewModel {
  return {
    id: overrides.id,
    front: "F",
    back: "B",
    source: "ai-full",
    generation_id: 1,
    status: "pending",
    ...overrides,
  };
}

describe("BulkSaveButton", () => {
  describe("reguła: odrzucone nigdy nie trafiają do API", () => {
    it("zwraca null gdy lista fiszek pusta", () => {
      const onSave = vi.fn();
      const { container } = render(
        <BulkSaveButton flashcards={[]} onSave={onSave} />
      );
      expect(container.firstChild).toBeNull();
    });

    it("przycisk 'Zapisz zaakceptowane' wywołuje onSave tylko z accepted i edited", () => {
      const onSave = vi.fn();
      const list: FlashcardViewModel[] = [
        makeFlashcard({ id: "1", status: "accepted" }),
        makeFlashcard({ id: "2", status: "edited" }),
        makeFlashcard({ id: "3", status: "pending" }),
        makeFlashcard({ id: "4", status: "rejected" }),
      ];
      render(<BulkSaveButton flashcards={list} onSave={onSave} />);

      const acceptedBtn = screen.getByRole("button", {
        name: /zapisz tylko zaakceptowane/i,
      });
      fireEvent.click(acceptedBtn);

      expect(onSave).toHaveBeenCalledTimes(1);
      const payload = onSave.mock.calls[0][0] as Array<{
        front: string;
        back: string;
        source: string;
        generation_id: number | null;
      }>;
      expect(payload).toHaveLength(2);
      expect(payload.map((p) => p.source)).toEqual(["ai-full", "ai-edited"]);
    });

    it("przycisk 'Zapisz wszystkie' wywołuje onSave z wszystkimi oprócz rejected", async () => {
      const onSave = vi.fn();
      const list: FlashcardViewModel[] = [
        makeFlashcard({ id: "1", status: "pending" }),
        makeFlashcard({ id: "2", status: "accepted" }),
        makeFlashcard({ id: "3", status: "rejected" }),
      ];
      render(<BulkSaveButton flashcards={list} onSave={onSave} />);

      const allBtn = screen.getByRole("button", {
        name: /zapisz wszystkie fiszki/i,
      });
      fireEvent.click(allBtn);

      expect(onSave).toHaveBeenCalledTimes(1);
      const payload = onSave.mock.calls[0][0];
      expect(payload).toHaveLength(2);
    });
  });

  describe("reguła: status edited → source 'ai-edited' w DTO", () => {
    it("fiszka ze statusem edited ma source 'ai-edited' w payloadzie", () => {
      const onSave = vi.fn();
      const list: FlashcardViewModel[] = [
        makeFlashcard({
          id: "1",
          status: "edited",
          front: "Przód",
          back: "Tył",
        }),
      ];
      render(<BulkSaveButton flashcards={list} onSave={onSave} />);

      const acceptedBtn = screen.getByRole("button", {
        name: /zapisz tylko zaakceptowane/i,
      });
      fireEvent.click(acceptedBtn);

      expect(onSave).toHaveBeenCalledWith([
        expect.objectContaining({
          front: "Przód",
          back: "Tył",
          source: "ai-edited",
          generation_id: 1,
        }),
      ]);
    });
  });

  describe("warunki brzegowe i stany przycisków", () => {
    it("'Zapisz zaakceptowane' jest disabled gdy brak accepted/edited", () => {
      const list: FlashcardViewModel[] = [
        makeFlashcard({ id: "1", status: "pending" }),
        makeFlashcard({ id: "2", status: "rejected" }),
      ];
      render(<BulkSaveButton flashcards={list} onSave={vi.fn()} />);

      expect(
        screen.getByRole("button", { name: /zapisz tylko zaakceptowane/i })
      ).toBeDisabled();
      expect(
        screen.getByRole("button", { name: /zapisz wszystkie fiszki/i })
      ).toBeEnabled();
    });

    it("'Zapisz wszystkie' jest disabled gdy wszystkie odrzucone", () => {
      const list: FlashcardViewModel[] = [
        makeFlashcard({ id: "1", status: "rejected" }),
      ];
      render(<BulkSaveButton flashcards={list} onSave={vi.fn()} />);

      expect(
        screen.getByRole("button", { name: /zapisz wszystkie fiszki/i })
      ).toBeDisabled();
    });

    it("wyświetla liczbę w przyciskach", () => {
      const list: FlashcardViewModel[] = [
        makeFlashcard({ id: "1", status: "accepted" }),
        makeFlashcard({ id: "2", status: "edited" }),
        makeFlashcard({ id: "3", status: "pending" }),
      ];
      render(<BulkSaveButton flashcards={list} onSave={vi.fn()} />);

      const group = screen.getByRole("group", { name: /zapis fiszek/i });
      expect(within(group).getByText(/zapisz zaakceptowane \(2\)/i)).toBeInTheDocument();
      expect(within(group).getByText(/zapisz wszystkie \(3\)/i)).toBeInTheDocument();
    });
  });
});
