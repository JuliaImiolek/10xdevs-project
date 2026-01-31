import * as React from "react";
import { Button } from "@/components/ui/button";

/**
 * Przycisk wylogowania. Wysyła POST do /api/auth/logout (Server Endpoint);
 * serwer zwraca 302 na /auth/login, przeglądarka wykonuje przekierowanie.
 */
function LogoutButton() {
  const labelId = React.useId();

  return (
    <form method="post" action="/api/auth/logout" className="inline" aria-labelledby={labelId}>
      <Button
        id={labelId}
        type="submit"
        variant="ghost"
        size="sm"
        className="text-sm font-medium text-foreground hover:text-foreground/80"
      >
        Wyloguj
      </Button>
    </form>
  );
}

export { LogoutButton };
