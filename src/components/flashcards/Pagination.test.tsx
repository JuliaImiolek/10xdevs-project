import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Pagination } from "./Pagination";

describe("Pagination", () => {
  describe("wyświetlanie stanu strony", () => {
    it("pokazuje tekst 'Strona 1 z 1' gdy jedna strona", () => {
      render(
        <Pagination
          pagination={{ page: 1, limit: 20, total: 5 }}
          onPageChange={vi.fn()}
        />
      );
      expect(screen.getByText("Strona 1 z 1")).toBeInTheDocument();
    });

    it("pokazuje 'Strona 2 z 3' przy total 50, limit 20", () => {
      render(
        <Pagination
          pagination={{ page: 2, limit: 20, total: 50 }}
          onPageChange={vi.fn()}
        />
      );
      expect(screen.getByText("Strona 2 z 3")).toBeInTheDocument();
    });

    it("warunek brzegowy: limit 0 traktowany jako 1 strona (maxPage)", () => {
      render(
        <Pagination
          pagination={{ page: 1, limit: 0, total: 100 }}
          onPageChange={vi.fn()}
        />
      );
      expect(screen.getByText("Strona 1 z 1")).toBeInTheDocument();
    });
  });

  describe("przyciski Poprzednia / Następna", () => {
    it("przycisk Poprzednia jest disabled na pierwszej stronie", () => {
      render(
        <Pagination
          pagination={{ page: 1, limit: 20, total: 50 }}
          onPageChange={vi.fn()}
        />
      );
      const prev = screen.getByRole("button", { name: /poprzednia strona/i });
      expect(prev).toBeDisabled();
    });

    it("przycisk Następna jest disabled na ostatniej stronie", () => {
      render(
        <Pagination
          pagination={{ page: 3, limit: 20, total: 50 }}
          onPageChange={vi.fn()}
        />
      );
      const next = screen.getByRole("button", { name: /następna strona/i });
      expect(next).toBeDisabled();
    });

    it("oba przyciski aktywne na środkowej stronie", () => {
      render(
        <Pagination
          pagination={{ page: 2, limit: 20, total: 50 }}
          onPageChange={vi.fn()}
        />
      );
      expect(screen.getByRole("button", { name: /poprzednia strona/i })).not.toBeDisabled();
      expect(screen.getByRole("button", { name: /następna strona/i })).not.toBeDisabled();
    });

    it("oba przyciski disabled gdy disabled=true", () => {
      render(
        <Pagination
          pagination={{ page: 2, limit: 20, total: 50 }}
          onPageChange={vi.fn()}
          disabled={true}
        />
      );
      expect(screen.getByRole("button", { name: /poprzednia strona/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /następna strona/i })).toBeDisabled();
    });
  });

  describe("callback onPageChange", () => {
    it("wywołuje onPageChange(page - 1) po kliknięciu Poprzednia", () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          pagination={{ page: 2, limit: 20, total: 50 }}
          onPageChange={onPageChange}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /poprzednia strona/i }));

      expect(onPageChange).toHaveBeenCalledTimes(1);
      expect(onPageChange).toHaveBeenCalledWith(1);
    });

    it("wywołuje onPageChange(page + 1) po kliknięciu Następna", () => {
      const onPageChange = vi.fn();
      render(
        <Pagination
          pagination={{ page: 2, limit: 20, total: 50 }}
          onPageChange={onPageChange}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /następna strona/i }));

      expect(onPageChange).toHaveBeenCalledTimes(1);
      expect(onPageChange).toHaveBeenCalledWith(3);
    });
  });

  describe("dostępność", () => {
    it("ma aria-label 'Nawigacja stron' na nav", () => {
      render(
        <Pagination
          pagination={{ page: 1, limit: 20, total: 0 }}
          onPageChange={vi.fn()}
        />
      );
      const nav = screen.getByRole("navigation", { name: /nawigacja stron/i });
      expect(nav).toBeInTheDocument();
    });
  });
});
