import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SessionCard } from "./SessionCard";
import type { FlashcardDto } from "@/types";

const baseFlashcard: FlashcardDto = {
  id: 1,
  front: "Pytanie testowe",
  back: "Odpowiedź testowa",
  source: "manual",
  generation_id: null,
  created_at: "2025-01-01",
  updated_at: "2025-01-01",
};

describe("SessionCard", () => {
  describe("wyświetlanie przodu i tyłu (reguła biznesowa: tył tylko po odsłonięciu)", () => {
    it("zawsze pokazuje przód fiszki (front)", () => {
      render(<SessionCard flashcard={baseFlashcard} revealed={false} />);
      expect(screen.getByLabelText("Przód fiszki")).toHaveTextContent("Pytanie testowe");
    });

    it("nie pokazuje tyłu gdy revealed=false", () => {
      render(<SessionCard flashcard={baseFlashcard} revealed={false} />);
      expect(screen.queryByLabelText("Tył fiszki")).not.toBeInTheDocument();
      expect(screen.queryByText("Odpowiedź testowa")).not.toBeInTheDocument();
    });

    it("pokazuje tył gdy revealed=true", () => {
      render(<SessionCard flashcard={baseFlashcard} revealed={true} />);
      const back = screen.getByLabelText("Tył fiszki");
      expect(back).toHaveTextContent("Odpowiedź testowa");
    });

    it("pokazuje zarówno przód jak i tył gdy revealed=true", () => {
      render(<SessionCard flashcard={baseFlashcard} revealed={true} />);
      expect(screen.getByLabelText("Przód fiszki")).toHaveTextContent("Pytanie testowe");
      expect(screen.getByLabelText("Tył fiszki")).toHaveTextContent("Odpowiedź testowa");
    });
  });

  describe("warunki brzegowe: treść fiszki", () => {
    it("renderuje pusty przód gdy front jest pusty string", () => {
      const flashcard = { ...baseFlashcard, front: "" };
      render(<SessionCard flashcard={flashcard} revealed={false} />);
      const frontEl = screen.getByLabelText("Przód fiszki");
      expect(frontEl).toBeInTheDocument();
      expect(frontEl).toHaveTextContent("");
    });

    it("renderuje długi tekst na tyle gdy revealed=true", () => {
      const longBack = "A".repeat(200);
      const flashcard = { ...baseFlashcard, back: longBack };
      render(<SessionCard flashcard={flashcard} revealed={true} />);
      expect(screen.getByLabelText("Tył fiszki")).toHaveTextContent(longBack);
    });
  });
});
