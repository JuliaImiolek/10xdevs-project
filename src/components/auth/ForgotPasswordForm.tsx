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
import { validateEmail } from "@/lib/validations/auth";

function ForgotPasswordForm() {
  const emailId = React.useId();

  const [email, setEmail] = React.useState("");
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);
      setSuccessMessage(null);

      const emailErr = validateEmail(email);
      setEmailError(emailErr);

      if (emailErr) return;

      setLoading(true);
      try {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim() }),
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok) {
          setSuccessMessage(
            data?.message ??
              "Jeśli konto z podanym adresem e-mail istnieje, wysłaliśmy na niego link do resetu hasła. Sprawdź skrzynkę (w tym folder spam)."
          );
          setEmail("");
          setEmailError(null);
          return;
        }

        setFormError(
          data?.message ?? data?.error ?? "Wystąpił błąd. Spróbuj ponownie później."
        );
      } catch {
        setFormError("Wystąpił błąd połączenia. Sprawdź połączenie i spróbuj ponownie.");
      } finally {
        setLoading(false);
      }
    },
    [email]
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold" id="forgot-heading">
          Odzyskiwanie hasła
        </h1>
        <p className="text-muted-foreground">
          Podaj adres e-mail powiązany z kontem. Wyślemy link do ustawienia nowego hasła.
        </p>
      </header>

      <Card>
        <form onSubmit={handleSubmit} aria-labelledby="forgot-heading" noValidate>
          <CardHeader>
            <CardTitle>Adres e-mail</CardTitle>
            <CardDescription>Wprowadź adres e-mail użyty przy rejestracji.</CardDescription>
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

            <Button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              aria-label={loading ? "Wysyłanie…" : "Wyślij link do resetu hasła"}
            >
              {loading ? "Wysyłanie…" : "Wyślij link do resetu hasła"}
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

export { ForgotPasswordForm };
export default ForgotPasswordForm;
