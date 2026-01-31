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
  validateEmail,
  validatePassword,
  validatePasswordConfirm,
} from "@/lib/validations/auth";

function RegisterForm() {
  const emailId = React.useId();
  const passwordId = React.useId();
  const confirmId = React.useId();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [emailError, setEmailError] = React.useState<string | null>(null);
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

      const emailErr = validateEmail(email);
      const passwordErr = validatePassword(password);
      const confirmErr = validatePasswordConfirm(password, confirmPassword);
      setEmailError(emailErr);
      setPasswordError(passwordErr);
      setConfirmError(confirmErr);

      if (emailErr || passwordErr || confirmErr) return;

      setLoading(true);
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password }),
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok) {
          setSuccessMessage(
            data?.message ??
              "Konto zostało utworzone. Sprawdź skrzynkę e-mail w celu potwierdzenia (jeśli włączone). Możesz się teraz zalogować."
          );
          setEmail("");
          setPassword("");
          setConfirmPassword("");
          setEmailError(null);
          setPasswordError(null);
          setConfirmError(null);
          return;
        }

        const message =
          data?.message ?? data?.error ?? "Ten adres e-mail jest już używany lub wystąpił błąd. Spróbuj ponownie.";
        setFormError(message);
      } catch {
        setFormError("Wystąpił błąd połączenia. Sprawdź połączenie i spróbuj ponownie.");
      } finally {
        setLoading(false);
      }
    },
    [email, password, confirmPassword]
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold" id="register-heading">
          Rejestracja
        </h1>
        <p className="text-muted-foreground">
          Utwórz konto, aby zapisywać fiszki i korzystać z sesji nauki.
        </p>
      </header>

      <Card>
        <form onSubmit={handleSubmit} aria-labelledby="register-heading" noValidate>
          <CardHeader>
            <CardTitle>Dane konta</CardTitle>
            <CardDescription>Wprowadź adres e-mail i hasło (min. 6 znaków).</CardDescription>
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
              <Label htmlFor={passwordId}>Hasło</Label>
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
              aria-label={loading ? "Rejestrowanie…" : "Zarejestruj się"}
            >
              {loading ? "Rejestrowanie…" : "Zarejestruj się"}
            </Button>
          </CardContent>
        </form>
      </Card>

      <p className="text-sm text-muted-foreground">
        Masz już konto?{" "}
        <a href="/auth/login" className="text-primary underline underline-offset-4 hover:no-underline">
          Zaloguj się
        </a>
      </p>
    </div>
  );
}

export { RegisterForm };
export default RegisterForm;
