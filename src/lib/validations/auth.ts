/**
 * Client-side validation helpers and Zod schemas for auth.
 * Backend uses Zod in API routes; client helpers mirror rules for UX.
 */
import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 6;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Zod schema for POST /api/auth/login */
export const loginBodySchema = z.object({
  email: z.string().min(1, "Adres e-mail jest wymagany.").email("Podaj prawidłowy adres e-mail."),
  password: z.string().min(1, "Hasło jest wymagane."),
  redirectTo: z.string().optional(),
});

export function validateEmail(value: string): string | null {
  if (!value.trim()) return "Adres e-mail jest wymagany.";
  if (!EMAIL_REGEX.test(value.trim())) return "Podaj prawidłowy adres e-mail.";
  return null;
}

export function validatePassword(value: string, fieldName = "Hasło"): string | null {
  if (!value) return `${fieldName} jest wymagane.`;
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `${fieldName} musi mieć co najmniej ${PASSWORD_MIN_LENGTH} znaków.`;
  }
  return null;
}

export function validatePasswordConfirm(password: string, confirm: string): string | null {
  if (!confirm) return "Potwierdzenie hasła jest wymagane.";
  if (password !== confirm) return "Hasła nie są identyczne.";
  return null;
}
