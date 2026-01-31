import { describe, expect, it } from "vitest";
import {
  validateEditFlashcardForm,
  FRONT_MAX,
  BACK_MAX,
} from "./edit-flashcard";

describe("validateEditFlashcardForm", () => {
  describe("reguły biznesowe – pola wymagane", () => {
    it("zwraca błąd front gdy pole przód jest puste", () => {
      const result = validateEditFlashcardForm("", "odpowiedź", "manual");
      expect(result.front).toBe("Pole jest wymagane.");
      expect(result.back).toBeUndefined();
      expect(result.source).toBeUndefined();
    });

    it("zwraca błąd back gdy pole tył jest puste", () => {
      const result = validateEditFlashcardForm("pytanie", "", "manual");
      expect(result.back).toBe("Pole jest wymagane.");
      expect(result.front).toBeUndefined();
    });

    it("zwraca błędy obu pól gdy oba puste", () => {
      const result = validateEditFlashcardForm("", "", "manual");
      expect(result.front).toBe("Pole jest wymagane.");
      expect(result.back).toBe("Pole jest wymagane.");
    });

    it("traktuje same białe znaki jako puste pole", () => {
      const result = validateEditFlashcardForm("   ", "  \t\n  ", "manual");
      expect(result.front).toBe("Pole jest wymagane.");
      expect(result.back).toBe("Pole jest wymagane.");
    });
  });

  describe("reguły biznesowe – limity znaków", () => {
    it("zwraca błąd front gdy przekroczono limit znaków (front)", () => {
      const longFront = "a".repeat(FRONT_MAX + 1);
      const result = validateEditFlashcardForm(longFront, "back", "manual");
      expect(result.front).toBe(`Maksymalnie ${FRONT_MAX} znaków.`);
    });

    it("akceptuje front o długości dokładnie FRONT_MAX", () => {
      const exactFront = "a".repeat(FRONT_MAX);
      const result = validateEditFlashcardForm(exactFront, "back", "manual");
      expect(result.front).toBeUndefined();
    });

    it("zwraca błąd back gdy przekroczono limit znaków (back)", () => {
      const longBack = "b".repeat(BACK_MAX + 1);
      const result = validateEditFlashcardForm("front", longBack, "manual");
      expect(result.back).toBe(`Maksymalnie ${BACK_MAX} znaków.`);
    });

    it("akceptuje back o długości dokładnie BACK_MAX", () => {
      const exactBack = "b".repeat(BACK_MAX);
      const result = validateEditFlashcardForm("front", exactBack, "manual");
      expect(result.back).toBeUndefined();
    });
  });

  describe("reguły biznesowe – źródło", () => {
    it("zwraca błąd source gdy source nie jest ai-edited ani manual", () => {
      const result = validateEditFlashcardForm("f", "b", "");
      expect(result.source).toBe("Wybierz źródło.");
    });

    it("akceptuje source 'manual'", () => {
      const result = validateEditFlashcardForm("front", "back", "manual");
      expect(result.source).toBeUndefined();
      expect(Object.keys(result)).toHaveLength(0);
    });

    it("akceptuje source 'ai-edited'", () => {
      const result = validateEditFlashcardForm("front", "back", "ai-edited");
      expect(result.source).toBeUndefined();
      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe("warunki brzegowe", () => {
    it("zwraca pusty obiekt gdy wszystkie dane poprawne", () => {
      const result = validateEditFlashcardForm("pytanie", "odpowiedź", "manual");
      expect(result).toEqual({});
    });

    it("łączy wiele błędów w jednym wywołaniu", () => {
      const result = validateEditFlashcardForm("", "", "");
      expect(result).toMatchInlineSnapshot(`
        {
          "back": "Pole jest wymagane.",
          "front": "Pole jest wymagane.",
          "source": "Wybierz źródło.",
        }
      `);
    });

    it("trimuje whitespace przed sprawdzeniem długości (po trim nadal przekroczony limit)", () => {
      const result = validateEditFlashcardForm(
        " " + "a".repeat(FRONT_MAX + 1),
        " " + "b".repeat(BACK_MAX + 1),
        "manual"
      );
      expect(result.front).toBe(`Maksymalnie ${FRONT_MAX} znaków.`);
      expect(result.back).toBe(`Maksymalnie ${BACK_MAX} znaków.`);
    });
  });
});
