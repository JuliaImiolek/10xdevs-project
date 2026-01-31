import * as React from "react";
import { ChangePasswordForm } from "./ChangePasswordForm";
import { DeleteAccountForm } from "./DeleteAccountForm";

/**
 * Widok ustawień konta: zmiana hasła i usunięcie konta.
 * Zgodnie ze specyfikacją: jeden widok zawierający ChangePasswordForm i DeleteAccountForm.
 */
function AccountSettingsView() {
  return (
    <main role="main" aria-label="Ustawienia konta" className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Ustawienia konta</h1>
        <p className="text-muted-foreground">
          Zmień hasło lub trwale usuń konto i wszystkie powiązane dane.
        </p>
      </header>

      <ChangePasswordForm />

      <DeleteAccountForm />
    </main>
  );
}

export { AccountSettingsView };
export default AccountSettingsView;
