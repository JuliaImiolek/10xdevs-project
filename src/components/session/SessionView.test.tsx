import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SessionView from "./SessionView";
import type { FlashcardDto } from "@/types";

const mockUseSessionFlashcards = vi.fn();
const mockSubmitReview = vi.fn();

vi.mock("@/components/hooks/useSessionFlashcards", () => ({
  useSessionFlashcards: () => mockUseSessionFlashcards(),
}));

vi.mock("@/lib/flashcards-api", () => ({
  submitReview: (id: number, grade: number) => mockSubmitReview(id, grade),
}));

const sessionErrorUnauthorized = "Sesja wygasła. Zaloguj się ponownie.";

function makeFlashcard(id: number, front: string, back: string): FlashcardDto {
  return {
    id,
    front,
    back,
    source: "manual",
    generation_id: null,
    created_at: "2025-01-01",
    updated_at: "2025-01-01",
  };
}

describe("SessionView", () => {
  beforeEach(() => {
    mockUseSessionFlashcards.mockReset();
    mockSubmitReview.mockReset();
    mockSubmitReview.mockResolvedValue({ ok: true });
  });

  describe("stan ładowania (loading)", () => {
    it("pokazuje nagłówek 'Sesja powtórek' i szkielet gdy loading=true", () => {
      mockUseSessionFlashcards.mockReturnValue({
        data: [],
        loading: true,
        error: null,
        refetch: vi.fn(),
      });

      render(<SessionView />);

      expect(screen.getByRole("main", { name: /sesja powtórek/i })).toBeInTheDocument();
      expect(screen.getByText("Sesja powtórek")).toBeInTheDocument();
      expect(screen.getByRole("main").querySelector("[data-slot='skeleton']")).toBeInTheDocument();
    });
  });

  describe("stan błędu (error) – reguła biznesowa: 401 vs inne", () => {
    it("pokazuje komunikat błędu i przycisk 'Spróbuj ponownie' gdy error inny niż 401", () => {
      const refetch = vi.fn();
      mockUseSessionFlashcards.mockReturnValue({
        data: [],
        loading: false,
        error: "Wystąpił błąd. Spróbuj ponownie.",
        refetch,
      });

      render(<SessionView />);

      expect(screen.getByRole("alert")).toHaveTextContent("Wystąpił błąd. Spróbuj ponownie.");
      const retryBtn = screen.getByRole("button", { name: /spróbuj ponownie/i });
      expect(retryBtn).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /zaloguj się/i })).not.toBeInTheDocument();

      fireEvent.click(retryBtn);
      expect(refetch).toHaveBeenCalledTimes(1);
    });

    it("pokazuje link 'Zaloguj się' do /auth/login gdy error=401 (reguła: wylogowanie)", () => {
      mockUseSessionFlashcards.mockReturnValue({
        data: [],
        loading: false,
        error: sessionErrorUnauthorized,
        refetch: vi.fn(),
      });

      render(<SessionView />);

      expect(screen.getByRole("alert")).toHaveTextContent(sessionErrorUnauthorized);
      const loginLink = screen.getByRole("link", { name: /zaloguj się/i });
      expect(loginLink).toHaveAttribute("href", "/auth/login");
      expect(screen.queryByRole("button", { name: /spróbuj ponownie/i })).not.toBeInTheDocument();
    });
  });

  describe("pusta lista fiszek (warunek brzegowy)", () => {
    it("pokazuje komunikat 'Brak fiszek do powtórzenia' i link do Moje fiszki", () => {
      mockUseSessionFlashcards.mockReturnValue({
        data: [],
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<SessionView />);

      expect(screen.getByText(/brak fiszek do powtórzenia/i)).toBeInTheDocument();
      const link = screen.getByRole("link", { name: /moje fiszki/i });
      expect(link).toHaveAttribute("href", "/flashcards");
    });
  });

  describe("zakończona sesja (sessionEnded)", () => {
    it("pokazuje SessionSummary z liczbą powtórzonych fiszek i przycisk Restart", async () => {
      const cards: FlashcardDto[] = [
        makeFlashcard(1, "P1", "O1"),
        makeFlashcard(2, "P2", "O2"),
      ];
      mockUseSessionFlashcards.mockReturnValue({
        data: cards,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<SessionView />);

      expect(screen.getByText("Fiszka 1 z 2")).toBeInTheDocument();
      expect(screen.getByLabelText("Przód fiszki")).toHaveTextContent("P1");

      fireEvent.click(screen.getByRole("button", { name: /pokaż odpowiedź/i }));
      fireEvent.click(screen.getByRole("button", { name: /oceń: dobrze/i }));
      await waitFor(() => {
        expect(screen.getByText("Fiszka 2 z 2")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /pokaż odpowiedź/i }));
      fireEvent.click(screen.getByRole("button", { name: /oceń: źle/i }));

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /sesja zakończona/i })).toBeInTheDocument();
        expect(screen.getByText(/powtórzono 2 fiszki\./i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /rozpocznij sesję ponownie/i }));

      await waitFor(() => {
        expect(screen.getByText("Fiszka 1 z 2")).toBeInTheDocument();
        expect(screen.getByLabelText("Przód fiszki")).toHaveTextContent("P1");
      });
    });
  });

  describe("aktywna karta – wyświetlanie", () => {
    it("pokazuje SessionProgress, SessionCard i SessionControls gdy są fiszki", () => {
      const cards = [makeFlashcard(1, "Pytanie", "Odpowiedź")];
      mockUseSessionFlashcards.mockReturnValue({
        data: cards,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<SessionView />);

      expect(screen.getByRole("main", { name: /sesja powtórek/i })).toBeInTheDocument();
      expect(screen.getByText("Fiszka 1 z 1")).toBeInTheDocument();
      expect(screen.getByLabelText("Przód fiszki")).toHaveTextContent("Pytanie");
      expect(screen.getByRole("button", { name: /pokaż odpowiedź/i })).toBeInTheDocument();
    });
  });

  describe("interakcje – Pokaż odpowiedź i ocena (reguła: submitReview + następna karta)", () => {
    it("po 'Pokaż odpowiedź' pokazuje tył fiszki i przyciski oceny", () => {
      const cards = [makeFlashcard(1, "P", "O")];
      mockUseSessionFlashcards.mockReturnValue({
        data: cards,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<SessionView />);
      fireEvent.click(screen.getByRole("button", { name: /pokaż odpowiedź/i }));

      expect(screen.getByLabelText("Tył fiszki")).toHaveTextContent("O");
      expect(screen.getByRole("button", { name: /oceń: źle/i })).toBeInTheDocument();
    });

    it("po ocenie wywołuje submitReview z id fiszki i grade, przechodzi do następnej karty", async () => {
      const cards = [
        makeFlashcard(10, "P1", "O1"),
        makeFlashcard(20, "P2", "O2"),
      ];
      mockUseSessionFlashcards.mockReturnValue({
        data: cards,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<SessionView />);

      fireEvent.click(screen.getByRole("button", { name: /pokaż odpowiedź/i }));
      fireEvent.click(screen.getByRole("button", { name: /oceń: średnio/i }));

      await waitFor(() => {
        expect(mockSubmitReview).toHaveBeenCalledTimes(1);
        expect(mockSubmitReview).toHaveBeenCalledWith(10, 2);
      });

      await waitFor(() => {
        expect(screen.getByText("Fiszka 2 z 2")).toBeInTheDocument();
        expect(screen.getByLabelText("Przód fiszki")).toHaveTextContent("P2");
      });
    });

    it("po Pomiń przechodzi do następnej karty bez wywołania submitReview", async () => {
      const cards = [
        makeFlashcard(1, "P1", "O1"),
        makeFlashcard(2, "P2", "O2"),
      ];
      mockUseSessionFlashcards.mockReturnValue({
        data: cards,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<SessionView />);

      fireEvent.click(screen.getByRole("button", { name: /pokaż odpowiedź/i }));
      fireEvent.click(screen.getByRole("button", { name: /pomiń fiszkę/i }));

      expect(mockSubmitReview).not.toHaveBeenCalled();

      await waitFor(() => {
        expect(screen.getByText("Fiszka 2 z 2")).toBeInTheDocument();
        expect(screen.getByLabelText("Przód fiszki")).toHaveTextContent("P2");
      });
    });

    it("po ocenie ostatniej fiszki pokazuje SessionSummary (koniec sesji)", async () => {
      const cards = [makeFlashcard(1, "P", "O")];
      mockUseSessionFlashcards.mockReturnValue({
        data: cards,
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<SessionView />);

      fireEvent.click(screen.getByRole("button", { name: /pokaż odpowiedź/i }));
      fireEvent.click(screen.getByRole("button", { name: /oceń: dobrze/i }));

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /sesja zakończona/i })).toBeInTheDocument();
        expect(screen.getByText(/powtórzono 1 fiszkę\./i)).toBeInTheDocument();
      });
      expect(mockSubmitReview).toHaveBeenCalledWith(1, 3);
    });
  });

});
