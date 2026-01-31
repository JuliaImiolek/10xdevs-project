import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FlashcardsList } from "./FlashcardsList";
import type { FlashcardDto, PaginationDto } from "@/types";

const basePagination: PaginationDto = { page: 1, limit: 20, total: 0 };

const makeFlashcard = (overrides?: Partial<FlashcardDto>): FlashcardDto => ({
  id: 1,
  front: "Pytanie testowe",
  back: "Odpowiedź",
  source: "manual",
  generation_id: null,
  created_at: "2025-01-01",
  updated_at: "2025-01-01",
  ...overrides,
});

describe("FlashcardsList", () => {
  describe("stan ładowania", () => {
    it("renderuje sekcję listy i szkielet gdy loading=true", () => {
      render(
        <FlashcardsList
          flashcards={[]}
          pagination={basePagination}
          loading={true}
          error={null}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onPageChange={vi.fn()}
        />
      );

      const section = screen.getByRole("region", { name: /lista fiszek/i });
      expect(section).toBeInTheDocument();
      expect(screen.queryByText("Brak fiszek")).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.queryByRole("list")).not.toBeInTheDocument();
    });
  });

  describe("stan błędu", () => {
    it("renderuje komunikat błędu z role=alert", () => {
      const errorMessage = "Sesja wygasła. Zaloguj się ponownie.";
      render(
        <FlashcardsList
          flashcards={[]}
          pagination={basePagination}
          loading={false}
          error={errorMessage}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onPageChange={vi.fn()}
        />
      );

      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent(errorMessage);
      expect(screen.queryByRole("list")).not.toBeInTheDocument();
    });
  });

  describe("pusta lista", () => {
    it("pokazuje 'Brak fiszek' i link do /generate gdy emptyDueToSearch=false", () => {
      render(
        <FlashcardsList
          flashcards={[]}
          pagination={basePagination}
          loading={false}
          error={null}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onPageChange={vi.fn()}
          emptyDueToSearch={false}
        />
      );

      expect(screen.getByText(/Brak fiszek\./)).toBeInTheDocument();
      const link = screen.getByRole("link", { name: /wygeneruj fiszki/i });
      expect(link).toHaveAttribute("href", "/generate");
      expect(screen.queryByText("Brak wyników wyszukiwania.")).not.toBeInTheDocument();
    });

    it("pokazuje 'Brak wyników wyszukiwania.' gdy emptyDueToSearch=true", () => {
      render(
        <FlashcardsList
          flashcards={[]}
          pagination={basePagination}
          loading={false}
          error={null}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onPageChange={vi.fn()}
          emptyDueToSearch={true}
        />
      );

      expect(screen.getByText("Brak wyników wyszukiwania.")).toBeInTheDocument();
      expect(screen.queryByText("Brak fiszek.")).not.toBeInTheDocument();
    });

    it("renderuje Pagination także przy pustej liście", () => {
      render(
        <FlashcardsList
          flashcards={[]}
          pagination={basePagination}
          loading={false}
          error={null}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onPageChange={vi.fn()}
        />
      );

      expect(screen.getByRole("navigation", { name: /nawigacja stron/i })).toBeInTheDocument();
    });
  });

  describe("lista z danymi", () => {
    it("renderuje listę fiszek i Pagination", () => {
      const flashcards = [makeFlashcard({ id: 1 }), makeFlashcard({ id: 2, front: "Drugie" })];
      const pagination = { page: 1, limit: 20, total: 2 };

      render(
        <FlashcardsList
          flashcards={flashcards}
          pagination={pagination}
          loading={false}
          error={null}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onPageChange={vi.fn()}
        />
      );

      const list = screen.getByRole("list");
      expect(list).toBeInTheDocument();
      const items = screen.getAllByRole("listitem");
      expect(items).toHaveLength(2);
      expect(screen.getByText("Pytanie testowe")).toBeInTheDocument();
      expect(screen.getByText("Drugie")).toBeInTheDocument();
      expect(screen.getByRole("navigation", { name: /nawigacja stron/i })).toBeInTheDocument();
    });

    it("wywołuje onEdit z fiszką po kliknięciu Edycja", () => {
      const flashcards = [makeFlashcard({ id: 42 })];
      const onEdit = vi.fn();

      render(
        <FlashcardsList
          flashcards={flashcards}
          pagination={{ ...basePagination, total: 1 }}
          loading={false}
          error={null}
          onEdit={onEdit}
          onDelete={vi.fn()}
          onPageChange={vi.fn()}
        />
      );

      const editButton = screen.getByRole("button", { name: /edycja fiszki/i });
      editButton.click();

      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onEdit).toHaveBeenCalledWith(flashcards[0]);
    });

    it("wywołuje onDelete z fiszką po kliknięciu Usuń", () => {
      const flashcards = [makeFlashcard({ id: 42 })];
      const onDelete = vi.fn();

      render(
        <FlashcardsList
          flashcards={flashcards}
          pagination={{ ...basePagination, total: 1 }}
          loading={false}
          error={null}
          onEdit={vi.fn()}
          onDelete={onDelete}
          onPageChange={vi.fn()}
        />
      );

      const deleteButton = screen.getByRole("button", { name: /usuń fiszkę/i });
      deleteButton.click();

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith(flashcards[0]);
    });
  });

  describe("dostępność", () => {
    it("sekcja ma aria-label 'Lista fiszek'", () => {
      render(
        <FlashcardsList
          flashcards={[]}
          pagination={basePagination}
          loading={false}
          error={null}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onPageChange={vi.fn()}
        />
      );
      expect(screen.getByRole("region", { name: /lista fiszek/i })).toBeInTheDocument();
    });
  });
});
