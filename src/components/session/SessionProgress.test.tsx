import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SessionProgress } from "./SessionProgress";

describe("SessionProgress", () => {
  describe("wyświetlanie postępu (reguła: licznik 1-based)", () => {
    it("pokazuje 'Fiszka 1 z 5' gdy currentIndex=1, total=5", () => {
      render(<SessionProgress currentIndex={1} total={5} />);
      expect(screen.getByText("Fiszka 1 z 5")).toBeInTheDocument();
    });

    it("pokazuje 'Fiszka 3 z 10' gdy currentIndex=3, total=10", () => {
      render(<SessionProgress currentIndex={3} total={10} />);
      expect(screen.getByText("Fiszka 3 z 10")).toBeInTheDocument();
    });

    it("pokazuje 'Fiszka 1 z 1' gdy jedna fiszka w sesji", () => {
      render(<SessionProgress currentIndex={1} total={1} />);
      expect(screen.getByText("Fiszka 1 z 1")).toBeInTheDocument();
    });
  });

  describe("warunek brzegowy: total < 1", () => {
    it("zwraca null gdy total=0 (brak fiszek)", () => {
      const { container } = render(<SessionProgress currentIndex={0} total={0} />);
      expect(container.firstChild).toBeNull();
    });

    it("zwraca null gdy total ujemny (ochrona przed błędnymi danymi)", () => {
      const { container } = render(<SessionProgress currentIndex={1} total={-1} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("dostępność", () => {
    it("ma role=status i aria-label z bieżącą pozycją", () => {
      render(<SessionProgress currentIndex={2} total={7} />);
      const status = screen.getByRole("status", { name: /fiszka 2 z 7/i });
      expect(status).toBeInTheDocument();
      expect(status).toHaveAttribute("aria-live", "polite");
    });
  });
});
