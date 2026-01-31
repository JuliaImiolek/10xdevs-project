import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ErrorNotification } from "@/components/generate/ErrorNotification";
import {
  validatePassword,
  validatePasswordConfirm,
} from "@/lib/validations/auth";

export interface ResetPasswordFormProps {
  /** Token z linku e-mail (query reset-password?token=...). */
  token: string;
}

function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const passwordId = React.useId();
  const confirmId = React.useId();

  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [confirmError, setConfirmError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);
      setSuccessMessage(null);

      if (!token.trim()) {
        setFormError("Brak tokenu resetu. Użyj linku z e-maila.");
        return;
      }

      const passwordErr = validatePassword(password, "Nowe hasło");
      const confirmErr = validatePasswordConfirm(password, confirmPassword);
      setPasswordError(passwordErr);
      setConfirmError(confirmErr);

      if (passwordErr || confirmErr) return;

      setLoading(true);
      try {
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: token.trim(), new_password: password }),
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok) {
          setSuccessMessage(
            data?.message ?? "Hasło zostało zmienione. Możesz się zalogować."
          );
          setPassword("");
          setConfirmPassword("");
          setPasswordError(null);
          setConfirmError(null);
          setTimeout(() => {
            window.location.href = "/login";
          }, 2000);
          return;
        }

        const message =
          data?.message ?? data?.error ?? "Link do resetu wygasł lub jest nieprawidłowy. Poproś o nowy link.";
        setFormError(message);
      } catch {
        setFormError("Wystąpił błąd połączenia. Sprawdź połączenie i spróbuj ponownie.");
      } finally {
        setLoading(false);
      }
    },
    [token, password, confirmPassword]
  );

  if (!token.trim()) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold">Ustawienie nowego hasła</h1>
          <p className="text-muted-foreground">
            Brak tokenu. Użyj linku z e-maila dotyczącego resetu hasła.
          </p>
        </header>
        <p className="text-sm text-muted-foreground">
          <a href="/forgot-password" className="text-primary underline underline-offset-4 hover:no-underline">
            Wyślij ponownie link do resetu hasła
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold" id="reset-heading">
          Ustawienie nowego hasła
        </h1>
        <p className="text-muted-foreground">
          Wprowadź nowe hasło (min. 6 znaków).
        </p>
      </header>

      <Card>
        <form onSubmit={handleSubmit} aria-labelledby="reset-heading" noValidate>
          <CardHeader>
            <CardTitle>Nowe hasło</CardTitle>
            <CardDescription>Hasło musi mieć co najmniej 6 znaków.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formError && <ErrorNotification errorMessage={formError} />}
            {successMessage && (
              <div
                role="status"
                className="rounded-lg border border-green-500/50 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400"
              >
                {successMessage}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor={passwordId}>Nowe hasło</Label>
              <Input
                id={passwordId}
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError(null);
                  setConfirmError(validatePasswordConfirm(e.target.value, confirmPassword));
                }}
                onBlur={() => setPasswordError(validatePassword(password, "Nowe hasło"))}
                disabled={loading}
                aria-invalid={!!passwordError}
                aria-describedby={passwordError ? `${passwordId}-error` : undefined}
              />
              {passwordError && (
                <p id={`${passwordId}-error`} className="text-sm text-destructive" role="alert">
                  {passwordError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor={confirmId}>Potwierdź hasło</Label>
              <Input
                id={confirmId}
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setConfirmError(validatePasswordConfirm(password, e.target.value));
                }}
                onBlur={() => setConfirmError(validatePasswordConfirm(password, confirmPassword))}
                disabled={loading}
                aria-invalid={!!confirmError}
                aria-describedby={confirmError ? `${confirmId}-error` : undefined}
              />
              {confirmError && (
                <p id={`${confirmId}-error`} className="text-sm text-destructive" role="alert">
                  {confirmError}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              aria-label={loading ? "Zapisywanie…" : "Zapisz nowe hasło"}
            >
              {loading ? "Zapisywanie…" : "Zapisz nowe hasło"}
            </Button>
          </CardContent>
        </form>
      </Card>

      <p className="text-sm text-muted-foreground">
        <a href="/login" className="text-primary underline underline-offset-4 hover:no-underline">
          Wróć do logowania
        </a>
      </p>
    </div>
  );
}

export { ResetPasswordForm };
export default ResetPasswordForm;
