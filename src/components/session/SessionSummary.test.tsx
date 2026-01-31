import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SessionSummary } from "./SessionSummary";

describe("SessionSummary", () => {
  describe("wyświetlanie podsumowania (reguła biznesowa: odmiana fiszek)", () => {
    it("pokazuje nagłówek 'Sesja zakończona'", () => {
      render(<SessionSummary totalReviewed={1} onRestart={vi.fn()} />);
      expect(screen.getByRole("heading", { name: /sesja zakończona/i })).toBeInTheDocument();
    });

    it("dla totalReviewed=1 pokazuje 'Powtórzono 1 fiszkę.'", () => {
      render(<SessionSummary totalReviewed={1} onRestart={vi.fn()} />);
      expect(screen.getByText(/powtórzono 1 fiszkę\./i)).toBeInTheDocument();
    });

    it("dla totalReviewed=2 pokazuje 'fiszki' (2–4)", () => {
      render(<SessionSummary totalReviewed={2} onRestart={vi.fn()} />);
      expect(screen.getByText(/powtórzono 2 fiszki\./i)).toBeInTheDocument();
    });

    it("dla totalReviewed=4 pokazuje 'fiszki'", () => {
      render(<SessionSummary totalReviewed={4} onRestart={vi.fn()} />);
      expect(screen.getByText(/powtórzono 4 fiszki\./i)).toBeInTheDocument();
    });

    it("dla totalReviewed=5 pokazuje 'fiszek' (5+)", () => {
      render(<SessionSummary totalReviewed={5} onRestart={vi.fn()} />);
      expect(screen.getByText(/powtórzono 5 fiszek\./i)).toBeInTheDocument();
    });

    it("dla totalReviewed=0 (warunek brzegowy) pokazuje '0 fiszki' (0 < 5 → fiszki)", () => {
      render(<SessionSummary totalReviewed={0} onRestart={vi.fn()} />);
      expect(screen.getByText(/powtórzono 0 fiszki\./i)).toBeInTheDocument();
    });
  });

  describe("callback onRestart", () => {
    it("wywołuje onRestart po kliknięciu 'Rozpocznij ponownie'", () => {
      const onRestart = vi.fn();
      render(<SessionSummary totalReviewed={3} onRestart={onRestart} />);
      fireEvent.click(screen.getByRole("button", { name: /rozpocznij sesję ponownie/i }));
      expect(onRestart).toHaveBeenCalledTimes(1);
    });
  });

  describe("nawigacja", () => {
    it("link 'Wróć do listy fiszek' ma href=/flashcards i aria-label", () => {
      render(<SessionSummary totalReviewed={1} onRestart={vi.fn()} />);
      const link = screen.getByRole("link", { name: /wróć do listy fiszek/i });
      expect(link).toHaveAttribute("href", "/flashcards");
      expect(link).toHaveTextContent("Wróć do listy fiszek");
    });
  });
});
