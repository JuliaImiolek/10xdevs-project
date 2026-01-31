import { describe, expect, it } from "vitest";
import {
  validateEmail,
  validatePassword,
  validatePasswordConfirm,
  PASSWORD_MIN_LENGTH,
  loginBodySchema,
  registerBodySchema,
  deleteAccountBodySchema,
  DELETE_ACCOUNT_CONFIRM_PHRASE,
} from "./auth";

describe("validateEmail", () => {
  it("zwraca błąd gdy pole puste", () => {
    expect(validateEmail("")).toBe("Adres e-mail jest wymagany.");
    expect(validateEmail("   ")).toBe("Adres e-mail jest wymagany.");
  });

  it("zwraca błąd gdy e-mail nieprawidłowy", () => {
    expect(validateEmail("a")).toBe("Podaj prawidłowy adres e-mail.");
    expect(validateEmail("a@")).toBe("Podaj prawidłowy adres e-mail.");
    expect(validateEmail("@b.pl")).toBe("Podaj prawidłowy adres e-mail.");
  });

  it("zwraca null gdy e-mail prawidłowy", () => {
    expect(validateEmail("user@example.com")).toBeNull();
    expect(validateEmail("  user@example.com  ")).toBeNull();
  });
});

describe("validatePassword", () => {
  it("zwraca błąd gdy puste", () => {
    expect(validatePassword("")).toBe("Hasło jest wymagane.");
  });

  it("zwraca błąd gdy za krótkie", () => {
    expect(validatePassword("a".repeat(PASSWORD_MIN_LENGTH - 1))).toBe(
      `Hasło musi mieć co najmniej ${PASSWORD_MIN_LENGTH} znaków.`
    );
  });

  it("zwraca null gdy długość OK", () => {
    expect(validatePassword("a".repeat(PASSWORD_MIN_LENGTH))).toBeNull();
    expect(validatePassword("longpassword")).toBeNull();
  });

  it("używa fieldName w komunikatach", () => {
    expect(validatePassword("", "Nowe hasło")).toBe("Nowe hasło jest wymagane.");
    expect(validatePassword("a", "Nowe hasło")).toBe(
      `Nowe hasło musi mieć co najmniej ${PASSWORD_MIN_LENGTH} znaków.`
    );
  });
});

describe("validatePasswordConfirm", () => {
  it("zwraca błąd gdy potwierdzenie puste", () => {
    expect(validatePasswordConfirm("pass123", "")).toBe("Potwierdzenie hasła jest wymagane.");
  });

  it("zwraca błąd gdy hasła różne", () => {
    expect(validatePasswordConfirm("pass123", "pass456")).toBe("Hasła nie są identyczne.");
  });

  it("zwraca null gdy hasła identyczne", () => {
    expect(validatePasswordConfirm("pass123", "pass123")).toBeNull();
  });
});

describe("loginBodySchema", () => {
  it("akceptuje poprawny payload", () => {
    const result = loginBodySchema.safeParse({
      email: "user@example.com",
      password: "secret",
    });
    expect(result.success).toBe(true);
  });

  it("akceptuje opcjonalne redirectTo", () => {
    const result = loginBodySchema.safeParse({
      email: "u@x.pl",
      password: "x",
      redirectTo: "/flashcards",
    });
    expect(result.success).toBe(true);
  });

  it("odrzuca pusty e-mail", () => {
    const result = loginBodySchema.safeParse({ email: "", password: "x" });
    expect(result.success).toBe(false);
  });

  it("odrzuca brak hasła", () => {
    const result = loginBodySchema.safeParse({ email: "u@x.pl", password: "" });
    expect(result.success).toBe(false);
  });
});

describe("registerBodySchema", () => {
  it("akceptuje hasło o minimalnej długości", () => {
    const result = registerBodySchema.safeParse({
      email: "u@x.pl",
      password: "a".repeat(PASSWORD_MIN_LENGTH),
    });
    expect(result.success).toBe(true);
  });

  it("odrzuca za krótkie hasło", () => {
    const result = registerBodySchema.safeParse({
      email: "u@x.pl",
      password: "a".repeat(PASSWORD_MIN_LENGTH - 1),
    });
    expect(result.success).toBe(false);
  });
});

describe("deleteAccountBodySchema", () => {
  it("akceptuje tylko literał USUŃ", () => {
    const ok = deleteAccountBodySchema.safeParse({ confirm: DELETE_ACCOUNT_CONFIRM_PHRASE });
    expect(ok.success).toBe(true);
  });

  it("odrzuca inne wartości", () => {
    expect(deleteAccountBodySchema.safeParse({ confirm: "usun" }).success).toBe(false);
    expect(deleteAccountBodySchema.safeParse({ confirm: "" }).success).toBe(false);
  });
});
