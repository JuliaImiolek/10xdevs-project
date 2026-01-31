import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  sessionGradeToSm2,
  scheduleReview,
  nextReviewAtFromInterval,
  DEFAULT_SRS_STATE,
  type SrsState,
} from "./srs";

describe("sessionGradeToSm2", () => {
  it("mapuje ocenę 1 (Źle) na SM-2 grade 1", () => {
    expect(sessionGradeToSm2(1)).toBe(1);
  });

  it("mapuje ocenę 2 (Średnio) na SM-2 grade 3", () => {
    expect(sessionGradeToSm2(2)).toBe(3);
  });

  it("mapuje ocenę 3 (Dobrze) na SM-2 grade 5", () => {
    expect(sessionGradeToSm2(3)).toBe(5);
  });
});

describe("scheduleReview", () => {
  it("zwraca zwiększony interval przy pierwszej powtórce (grade 3)", () => {
    const result = scheduleReview(3, DEFAULT_SRS_STATE);
    expect(result.interval).toBeGreaterThan(0);
    expect(result.repetition).toBe(1);
    expect(result.efactor).toBeGreaterThan(0);
  });

  it("zwraca niski interval przy złej odpowiedzi (grade 1) z domyślnym stanem", () => {
    const result = scheduleReview(1, DEFAULT_SRS_STATE);
    // SM-2 przy pierwszej złej odpowiedzi: interval 0 lub 1, repetition 0
    expect(result.interval).toBeLessThanOrEqual(1);
    expect(result.repetition).toBe(0);
  });

  it("używa przekazanego stanu karty", () => {
    const state: SrsState = { interval: 5, repetition: 2, efactor: 2.6 };
    const result = scheduleReview(3, state);
    expect(result.interval).toBeGreaterThanOrEqual(0);
    expect(typeof result.efactor).toBe("number");
  });
});

describe("nextReviewAtFromInterval", () => {
  const fixedDate = new Date("2025-01-15T12:00:00.000Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixedDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("zwraca datę za N dni przy intervalDays = N", () => {
    const result = nextReviewAtFromInterval(3);
    expect(result).toEqual(new Date("2025-01-18T12:00:00.000Z"));
  });

  it("zwraca dzisiaj przy intervalDays = 0", () => {
    const result = nextReviewAtFromInterval(0);
    expect(result).toEqual(fixedDate);
  });
});
