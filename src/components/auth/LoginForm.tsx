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
import { validateEmail, validatePassword } from "@/lib/validations/auth";

export interface LoginFormProps {
  /** URL do przekierowania po udanym logowaniu (np. z query redirectTo). */
  redirectTo?: string;
  /** Komunikat sukcesu z przekierowania (np. po resecie hasła, usunięciu konta). */
  successMessage?: string;
}

function LoginForm({ redirectTo, successMessage: initialSuccessMessage }: LoginFormProps) {
  const emailId = React.useId();
  const passwordId = React.useId();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);

      const emailErr = validateEmail(email);
      const passwordErr = validatePassword(password);
      setEmailError(emailErr);
      setPasswordError(passwordErr);

      if (emailErr || passwordErr) return;

      setLoading(true);
      try {
        const body: { email: string; password: string; redirectTo?: string } = {
          email: email.trim(),
          password,
        };
        if (redirectTo) body.redirectTo = redirectTo;

        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (res.redirected) {
          window.location.href = res.url;
          return;
        }

        const data = await res.json().catch(() => ({}));
        const message =
          data?.message ?? data?.error ?? "Nieprawidłowy adres e-mail lub hasło. Spróbuj ponownie.";
        setFormError(message);
      } catch {
        setFormError("Wystąpił błąd połączenia. Sprawdź połączenie i spróbuj ponownie.");
      } finally {
        setLoading(false);
      }
    },
    [email, password, redirectTo]
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold" id="login-heading">
          Logowanie
        </h1>
        <p className="text-muted-foreground">
          Zaloguj się, aby korzystać z generowania fiszek i sesji nauki.
        </p>
      </header>

      <Card>
        <form onSubmit={handleSubmit} aria-labelledby="login-heading" noValidate>
          <CardHeader>
            <CardTitle>Dane logowania</CardTitle>
            <CardDescription>Wprowadź adres e-mail i hasło.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {formError && <ErrorNotification errorMessage={formError} />}
            {initialSuccessMessage && (
              <div
                role="status"
                className="rounded-lg border border-green-500/50 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400"
              >
                {decodeURIComponent(initialSuccessMessage)}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor={emailId}>Adres e-mail</Label>
              <Input
                id={emailId}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError(null);
                }}
                onBlur={() => setEmailError(validateEmail(email))}
                disabled={loading}
                aria-invalid={!!emailError}
                aria-describedby={emailError ? `${emailId}-error` : undefined}
              />
              {emailError && (
                <p id={`${emailId}-error`} className="text-sm text-destructive" role="alert">
                  {emailError}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor={passwordId}>Hasło</Label>
                <a
                  href="/auth/forgot-password"
                  className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
                >
                  Zapomniałeś hasła?
                </a>
              </div>
              <Input
                id={passwordId}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError(null);
                }}
                onBlur={() => setPasswordError(validatePassword(password))}
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

            <Button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              aria-label={loading ? "Logowanie…" : "Zaloguj się"}
            >
              {loading ? "Logowanie…" : "Zaloguj się"}
            </Button>
          </CardContent>
        </form>
      </Card>

      <p className="text-sm text-muted-foreground">
        Nie masz konta?{" "}
        <a href="/auth/register" className="text-primary underline underline-offset-4 hover:no-underline">
          Zarejestruj się
        </a>
      </p>
    </div>
  );
}

export { LoginForm };
export default LoginForm;
