/**
 * SRS (Spaced Repetition) — SM-2 via supermemo.
 * Maps UI session grade (1–3) to SM-2 grade (0–5) and computes next review date.
 */
import { supermemo, type SuperMemoItem, type SuperMemoGrade } from "supermemo";

/** UI grade: 1 = Źle, 2 = Średnio, 3 = Dobrze. Matches SessionGrade in types.ts. */
export type SessionGradeUi = 1 | 2 | 3;

/** SRS state stored per flashcard (matches DB columns). */
export interface SrsState {
  interval: number;
  repetition: number;
  efactor: number;
}

/** Default state for a card never reviewed. */
export const DEFAULT_SRS_STATE: SrsState = {
  interval: 0,
  repetition: 0,
  efactor: 2.5,
};

/**
 * Maps session UI grade (1–3) to SM-2 grade (0–5).
 * 1 Źle -> 1, 2 Średnio -> 3, 3 Dobrze -> 5.
 */
export function sessionGradeToSm2(grade: SessionGradeUi): SuperMemoGrade {
  const map: Record<SessionGradeUi, SuperMemoGrade> = {
    1: 1,
    2: 3,
    3: 5,
  };
  return map[grade];
}

/**
 * Runs SM-2 for one review. Returns updated interval (days), repetition count, and efactor.
 */
export function scheduleReview(
  grade: SessionGradeUi,
  state: SrsState
): { interval: number; repetition: number; efactor: number } {
  const item: SuperMemoItem = {
    interval: state.interval,
    repetition: state.repetition,
    efactor: state.efactor,
  };
  const sm2Grade = sessionGradeToSm2(grade);
  const next = supermemo(item, sm2Grade);
  return {
    interval: next.interval,
    repetition: next.repetition,
    efactor: next.efactor,
  };
}

/**
 * Computes next_review_at from now + interval days.
 */
export function nextReviewAtFromInterval(intervalDays: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + intervalDays);
  return d;
}
