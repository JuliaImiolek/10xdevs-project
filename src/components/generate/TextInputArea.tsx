import * as React from "react";
import { cn } from "@/lib/utils";

const MIN_LENGTH = 1000;
const MAX_LENGTH = 10000;

export interface TextInputAreaProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  onBlur?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Text area for source text (1000–10000 characters).
 * Validates length on blur and reports error via parent state.
 */
function TextInputArea({
  value,
  onChange,
  error,
  onBlur,
  disabled = false,
  className,
}: TextInputAreaProps) {
  const id = React.useId();
  const errorId = `${id}-error`;

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  return (
    <div className={cn("space-y-2", className)}>
      <label
        htmlFor={id}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        Tekst źródłowy (od {MIN_LENGTH} do {MAX_LENGTH} znaków)
      </label>
      <textarea
        id={id}
        value={value}
        onChange={handleChange}
        onBlur={onBlur}
        disabled={disabled}
        placeholder="Wklej lub wpisz tekst, na podstawie którego wygenerowane zostaną fiszki..."
        rows={12}
        className={cn(
          "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-destructive focus-visible:ring-destructive"
        )}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <p className="text-muted-foreground text-xs">
        {value.length} / {MAX_LENGTH} znaków
        {value.length > 0 && value.length < MIN_LENGTH && (
          <span className="text-destructive">
            {" "}
            (wymagane minimum: {MIN_LENGTH})
          </span>
        )}
      </p>
    </div>
  );
}

export { TextInputArea };
export { MIN_LENGTH as TEXT_INPUT_MIN_LENGTH, MAX_LENGTH as TEXT_INPUT_MAX_LENGTH };
