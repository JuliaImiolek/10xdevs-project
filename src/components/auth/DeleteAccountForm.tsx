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

const CONFIRM_PHRASE = "USUŃ";

function DeleteAccountForm() {
  const confirmId = React.useId();

  const [confirmPhrase, setConfirmPhrase] = React.useState("");
  const [confirmError, setConfirmError] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const isConfirmValid = confirmPhrase.trim().toUpperCase() === CONFIRM_PHRASE;

  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);

      if (!isConfirmValid) {
        setConfirmError(`Wpisz „${CONFIRM_PHRASE}”, aby potwierdzić usunięcie konta.`);
        return;
      }
      setConfirmError(null);

      setLoading(true);
      try {
        const res = await fetch("/api/auth/delete-account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirm: confirmPhrase.trim() }),
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok || res.redirected) {
          if (res.redirected) {
            window.location.href = res.url;
          } else {
            window.location.href = "/auth/login?message=Konto+zostało+usunięte";
          }
          return;
        }

        setFormError(
          data?.message ?? data?.error ?? "Wystąpił błąd podczas usuwania konta. Spróbuj ponownie."
        );
      } catch {
        setFormError("Wystąpił błąd połączenia. Sprawdź połączenie i spróbuj ponownie.");
      } finally {
        setLoading(false);
      }
    },
    [confirmPhrase, isConfirmValid]
  );

  return (
    <Card className="border-destructive/50">
      <form onSubmit={handleSubmit} aria-labelledby="delete-account-heading" noValidate>
        <CardHeader>
          <CardTitle id="delete-account-heading" className="text-destructive">
            Usuń konto
          </CardTitle>
          <CardDescription>
            Ta operacja jest nieodwracalna. Wszystkie Twoje fiszki i dane zostaną trwale usunięte.
            Wpisz „{CONFIRM_PHRASE}” w pole poniżej, aby potwierdzić.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {formError && <ErrorNotification errorMessage={formError} />}

          <div className="space-y-2">
            <Label htmlFor={confirmId}>
              Wpisz „{CONFIRM_PHRASE}”, aby potwierdzić
            </Label>
            <Input
              id={confirmId}
              type="text"
              autoComplete="off"
              value={confirmPhrase}
              onChange={(e) => {
                setConfirmPhrase(e.target.value);
                setConfirmError(null);
              }}
              onBlur={() => {
                if (confirmPhrase.trim() && !isConfirmValid) {
                  setConfirmError(`Wpisz dokładnie „${CONFIRM_PHRASE}”.`);
                } else {
                  setConfirmError(null);
                }
              }}
              disabled={loading}
              aria-invalid={!!confirmError || (!!confirmPhrase.trim() && !isConfirmValid)}
              aria-describedby={confirmError ? `${confirmId}-error` : undefined}
              placeholder={CONFIRM_PHRASE}
              className="font-mono"
            />
            {confirmError && (
              <p id={`${confirmId}-error`} className="text-sm text-destructive" role="alert">
                {confirmError}
              </p>
            )}
          </div>

          <Button
            type="submit"
            variant="destructive"
            disabled={loading || !isConfirmValid}
            aria-busy={loading}
            aria-label={loading ? "Usuwanie konta…" : "Usuń konto na stałe"}
          >
            {loading ? "Usuwanie konta…" : "Usuń konto na stałe"}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}

export { DeleteAccountForm };
