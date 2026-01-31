import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SessionControls } from "./SessionControls";
import { SESSION_GRADE_AGAIN, SESSION_GRADE_GOOD, SESSION_GRADE_EASY } from "@/types";

describe("SessionControls", () => {
  describe("stan nieodsłonięty (revealed=false) – reguła: jeden przycisk Pokaż odpowiedź", () => {
    it("pokazuje przycisk 'Pokaż odpowiedź' i nie pokazuje przycisków oceny", () => {
      const onReveal = vi.fn();
      render(
        <SessionControls revealed={false} onReveal={onReveal} onRate={vi.fn()} />
      );
      expect(screen.getByRole("button", { name: /pokaż odpowiedź/i })).toBeInTheDocument();
      expect(screen.queryByText("Źle")).not.toBeInTheDocument();
      expect(screen.queryByText("Średnio")).not.toBeInTheDocument();
      expect(screen.queryByText("Dobrze")).not.toBeInTheDocument();
    });

    it("wywołuje onReveal raz po kliknięciu 'Pokaż odpowiedź'", () => {
      const onReveal = vi.fn();
      render(
        <SessionControls revealed={false} onReveal={onReveal} onRate={vi.fn()} />
      );
      fireEvent.click(screen.getByRole("button", { name: /pokaż odpowiedź/i }));
      expect(onReveal).toHaveBeenCalledTimes(1);
    });

    it("przycisk jest disabled gdy disabled=true", () => {
      render(
        <SessionControls
          revealed={false}
          onReveal={vi.fn()}
          onRate={vi.fn()}
          disabled={true}
        />
      );
      expect(screen.getByRole("button", { name: /pokaż odpowiedź/i })).toBeDisabled();
    });
  });

  describe("stan odsłonięty (revealed=true) – przyciski oceny i Pomiń", () => {
    it("pokazuje przyciski Źle, Średnio, Dobrze według reguły biznesowej ocen", () => {
      render(
        <SessionControls revealed={true} onReveal={vi.fn()} onRate={vi.fn()} onSkip={vi.fn()} />
      );
      expect(screen.getByRole("button", { name: /oceń: źle/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /oceń: średnio/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /oceń: dobrze/i })).toBeInTheDocument();
    });

    it("wywołuje onRate z SESSION_GRADE_AGAIN (1) po kliknięciu Źle", () => {
      const onRate = vi.fn();
      render(
        <SessionControls revealed={true} onReveal={vi.fn()} onRate={onRate} onSkip={vi.fn()} />
      );
      fireEvent.click(screen.getByRole("button", { name: /oceń: źle/i }));
      expect(onRate).toHaveBeenCalledTimes(1);
      expect(onRate).toHaveBeenCalledWith(SESSION_GRADE_AGAIN);
    });

    it("wywołuje onRate z SESSION_GRADE_GOOD (2) po kliknięciu Średnio", () => {
      const onRate = vi.fn();
      render(
        <SessionControls revealed={true} onReveal={vi.fn()} onRate={onRate} onSkip={vi.fn()} />
      );
      fireEvent.click(screen.getByRole("button", { name: /oceń: średnio/i }));
      expect(onRate).toHaveBeenCalledWith(SESSION_GRADE_GOOD);
    });

    it("wywołuje onRate z SESSION_GRADE_EASY (3) po kliknięciu Dobrze", () => {
      const onRate = vi.fn();
      render(
        <SessionControls revealed={true} onReveal={vi.fn()} onRate={onRate} onSkip={vi.fn()} />
      );
      fireEvent.click(screen.getByRole("button", { name: /oceń: dobrze/i }));
      expect(onRate).toHaveBeenCalledWith(SESSION_GRADE_EASY);
    });

    it("pokazuje przycisk Pomiń i wywołuje onSkip po kliknięciu gdy onSkip podany", () => {
      const onSkip = vi.fn();
      render(
        <SessionControls revealed={true} onReveal={vi.fn()} onRate={vi.fn()} onSkip={onSkip} />
      );
      const skipBtn = screen.getByRole("button", { name: /pomiń fiszkę/i });
      expect(skipBtn).toBeInTheDocument();
      fireEvent.click(skipBtn);
      expect(onSkip).toHaveBeenCalledTimes(1);
    });

    it("nie pokazuje przycisku Pomiń gdy onSkip nie jest podany (warunek brzegowy)", () => {
      render(<SessionControls revealed={true} onReveal={vi.fn()} onRate={vi.fn()} />);
      expect(screen.queryByRole("button", { name: /pomiń fiszkę/i })).not.toBeInTheDocument();
    });

    it("wszystkie przyciski oceny i Pomiń są disabled gdy disabled=true", () => {
      render(
        <SessionControls
          revealed={true}
          onReveal={vi.fn()}
          onRate={vi.fn()}
          onSkip={vi.fn()}
          disabled={true}
        />
      );
      expect(screen.getByRole("button", { name: /oceń: źle/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /oceń: średnio/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /oceń: dobrze/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /pomiń fiszkę/i })).toBeDisabled();
    });
  });
});
