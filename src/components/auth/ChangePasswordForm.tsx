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

function ChangePasswordForm() {
  const currentId = React.useId();
  const newId = React.useId();
  const confirmId = React.useId();

  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [currentError, setCurrentError] = React.useState<string | null>(null);
  const [newError, setNewError] = React.useState<string | null>(null);
  const [confirmError, setConfirmError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);
      setSuccessMessage(null);

      const currentErr = validatePassword(currentPassword, "Obecne hasło");
      const newErr = validatePassword(newPassword, "Nowe hasło");
      const confirmErr = validatePasswordConfirm(newPassword, confirmPassword);
      setCurrentError(currentErr);
      setNewError(newErr);
      setConfirmError(confirmErr);

      if (currentErr || newErr || confirmErr) return;

      setLoading(true);
      try {
        const res = await fetch("/api/auth/change-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok) {
          setSuccessMessage(data?.message ?? "Hasło zostało zmienione.");
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
          setCurrentError(null);
          setNewError(null);
          setConfirmError(null);
          return;
        }

        setFormError(
          data?.message ?? data?.error ?? "Obecne hasło jest nieprawidłowe lub wystąpił błąd. Spróbuj ponownie."
        );
      } catch {
        setFormError("Wystąpił błąd połączenia. Sprawdź połączenie i spróbuj ponownie.");
      } finally {
        setLoading(false);
      }
    },
    [currentPassword, newPassword, confirmPassword]
  );

  return (
    <Card>
      <form onSubmit={handleSubmit} aria-labelledby="change-password-heading" noValidate>
        <CardHeader>
          <CardTitle id="change-password-heading">Zmiana hasła</CardTitle>
          <CardDescription>
            Wprowadź obecne hasło oraz nowe hasło (min. 6 znaków).
          </CardDescription>
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
            <Label htmlFor={currentId}>Obecne hasło</Label>
            <Input
              id={currentId}
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                setCurrentError(null);
              }}
              onBlur={() => setCurrentError(validatePassword(currentPassword, "Obecne hasło"))}
              disabled={loading}
              aria-invalid={!!currentError}
              aria-describedby={currentError ? `${currentId}-error` : undefined}
            />
            {currentError && (
              <p id={`${currentId}-error`} className="text-sm text-destructive" role="alert">
                {currentError}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={newId}>Nowe hasło</Label>
            <Input
              id={newId}
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setNewError(null);
                setConfirmError(validatePasswordConfirm(e.target.value, confirmPassword));
              }}
              onBlur={() => setNewError(validatePassword(newPassword, "Nowe hasło"))}
              disabled={loading}
              aria-invalid={!!newError}
              aria-describedby={newError ? `${newId}-error` : undefined}
            />
            {newError && (
              <p id={`${newId}-error`} className="text-sm text-destructive" role="alert">
                {newError}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={confirmId}>Potwierdź nowe hasło</Label>
            <Input
              id={confirmId}
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setConfirmError(validatePasswordConfirm(newPassword, e.target.value));
              }}
              onBlur={() => setConfirmError(validatePasswordConfirm(newPassword, confirmPassword))}
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
            aria-label={loading ? "Zapisywanie…" : "Zmień hasło"}
          >
            {loading ? "Zapisywanie…" : "Zmień hasło"}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}

export { ChangePasswordForm };
