import * as React from "react";
import { cn } from "@/lib/utils";

interface ErrorNotificationProps {
  errorMessage: string;
  className?: string;
}

/**
 * Displays error messages (validation or API) in a visible, accessible way.
 */
function ErrorNotification({ errorMessage, className }: ErrorNotificationProps) {
  if (!errorMessage) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive",
        className
      )}
    >
      {errorMessage}
    </div>
  );
}

export { ErrorNotification };
