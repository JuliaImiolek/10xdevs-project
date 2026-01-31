import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ManualFlashcardForm } from "./ManualFlashcardForm";

const mockCreateFlashcards = vi.fn();

vi.mock("@/lib/flashcards-api", () => ({
  createFlashcards: (payload: unknown) => mockCreateFlashcards(payload),
}));

describe("ManualFlashcardForm", () => {
  beforeEach(() => {
    mockCreateFlashcards.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("reguła: walidacja – przód i tył wymagane, max 200/500 znaków", () => {
    it("przy pustym przodzie submit pokazuje błąd i nie wywołuje API", async () => {
      render(<ManualFlashcardForm />);

      fireEvent.change(screen.getByPlaceholderText(/treść strony przedniej/i), {
        target: { value: "" },
      });
      fireEvent.change(screen.getByPlaceholderText(/treść strony tylnej/i), {
        target: { value: "Tył" },
      });
      fireEvent.click(screen.getByRole("button", { name: /zapisz fiszkę/i }));

      expect(screen.getByText("Pole jest wymagane.")).toBeInTheDocument();
      expect(mockCreateFlashcards).not.toHaveBeenCalled();
    });

    it("przy pustym tyle submit pokazuje błąd i nie wywołuje API", async () => {
      render(<ManualFlashcardForm />);

      fireEvent.change(screen.getByPlaceholderText(/treść strony przedniej/i), {
        target: { value: "Przód" },
      });
      fireEvent.change(screen.getByPlaceholderText(/treść strony tylnej/i), {
        target: { value: "" },
      });
      fireEvent.click(screen.getByRole("button", { name: /zapisz fiszkę/i }));

      expect(screen.getByText("Pole jest wymagane.")).toBeInTheDocument();
      expect(mockCreateFlashcards).not.toHaveBeenCalled();
    });

    it("przy przodzie > 200 znaków pokazuje błąd 'Maksymalnie 200 znaków'", () => {
      render(<ManualFlashcardForm />);

      const front = "a".repeat(201);
      fireEvent.change(screen.getByPlaceholderText(/treść strony przedniej/i), {
        target: { value: front },
      });
      fireEvent.change(screen.getByPlaceholderText(/treść strony tylnej/i), {
        target: { value: "Tył" },
      });
      fireEvent.click(screen.getByRole("button", { name: /zapisz fiszkę/i }));

      expect(screen.getByText(/maksymalnie 200 znaków/i)).toBeInTheDocument();
      expect(mockCreateFlashcards).not.toHaveBeenCalled();
    });

    it("przy tyle > 500 znaków pokazuje błąd 'Maksymalnie 500 znaków'", () => {
      render(<ManualFlashcardForm />);

      const back = "b".repeat(501);
      fireEvent.change(screen.getByPlaceholderText(/treść strony przedniej/i), {
        target: { value: "Przód" },
      });
      fireEvent.change(screen.getByPlaceholderText(/treść strony tylnej/i), {
        target: { value: back },
      });
      fireEvent.click(screen.getByRole("button", { name: /zapisz fiszkę/i }));

      expect(screen.getByText(/maksymalnie 500 znaków/i)).toBeInTheDocument();
      expect(mockCreateFlashcards).not.toHaveBeenCalled();
    });
  });

  describe("submit i API", () => {
    it("po sukcesie czyści pola i pokazuje komunikat sukcesu", async () => {
      mockCreateFlashcards.mockResolvedValue({ ok: true });
      render(<ManualFlashcardForm />);

      fireEvent.change(screen.getByPlaceholderText(/treść strony przedniej/i), {
        target: { value: "Przód" },
      });
      fireEvent.change(screen.getByPlaceholderText(/treść strony tylnej/i), {
        target: { value: "Tył" },
      });
      fireEvent.click(screen.getByRole("button", { name: /zapisz fiszkę/i }));

      await waitFor(() => {
        expect(mockCreateFlashcards).toHaveBeenCalledWith([
          {
            front: "Przód",
            back: "Tył",
            source: "manual",
            generation_id: null,
          },
        ]);
      });

      await waitFor(() => {
        expect(screen.getByText("Fiszka została zapisana.")).toBeInTheDocument();
      });
      expect(
        (screen.getByPlaceholderText(/treść strony przedniej/i) as HTMLInputElement).value
      ).toBe("");
      expect(
        (screen.getByPlaceholderText(/treść strony tylnej/i) as HTMLTextAreaElement).value
      ).toBe("");
    });

    it("po błędzie API wywołuje onError i pokazuje komunikat błędu", async () => {
      mockCreateFlashcards.mockResolvedValue({
        ok: false,
        error: { message: "Błąd serwera", status: 500 },
      });
      const onError = vi.fn();
      render(<ManualFlashcardForm onError={onError} />);

      fireEvent.change(screen.getByPlaceholderText(/treść strony przedniej/i), {
        target: { value: "Przód" },
      });
      fireEvent.change(screen.getByPlaceholderText(/treść strony tylnej/i), {
        target: { value: "Tył" },
      });
      fireEvent.click(screen.getByRole("button", { name: /zapisz fiszkę/i }));

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith("Błąd serwera");
      });
      expect(screen.getByText("Błąd serwera")).toBeInTheDocument();
    });

    it("gdy disabled, przycisk submit jest disabled", () => {
      render(<ManualFlashcardForm disabled />);

      expect(screen.getByRole("button", { name: /zapisz fiszkę/i })).toBeDisabled();
    });
  });
});
