import * as React from "react";
import type { FlashcardsListSort } from "@/types";
import { cn } from "@/lib/utils";

const SEARCH_MAX_LENGTH = 200;

const SORT_OPTIONS: { value: FlashcardsListSort; label: string }[] = [
  { value: "created_at_desc", label: "Data utworzenia (najnowsze)" },
  { value: "created_at", label: "Data utworzenia (najstarsze)" },
  { value: "updated_at_desc", label: "Data edycji (najnowsze)" },
  { value: "updated_at", label: "Data edycji (najstarsze)" },
  { value: "source_desc", label: "Źródło (Z–A)" },
  { value: "source", label: "Źródło (A–Z)" },
];

const SOURCE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Wszystkie źródła" },
  { value: "manual", label: "Ręcznie" },
  { value: "ai-full", label: "AI (pełne)" },
  { value: "ai-edited", label: "AI (edycja)" },
];

export interface ToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sourceFilter: "manual" | "ai-full" | "ai-edited" | undefined;
  onSourceFilterChange: (s: "manual" | "ai-full" | "ai-edited" | undefined) => void;
  sort: FlashcardsListSort;
  onSortChange: (s: FlashcardsListSort) => void;
  disabled?: boolean;
}

const inputBase =
  "h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function Toolbar({
  searchQuery,
  onSearchChange,
  sourceFilter,
  onSourceFilterChange,
  sort,
  onSortChange,
  disabled = false,
}: ToolbarProps) {
  const handleSearchChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      if (v.length <= SEARCH_MAX_LENGTH) onSearchChange(v);
    },
    [onSearchChange]
  );

  const handleSourceChange = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const v = e.target.value;
      onSourceFilterChange(
        v === "" ? undefined : (v as "manual" | "ai-full" | "ai-edited")
      );
    },
    [onSourceFilterChange]
  );

  const handleSortChange = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onSortChange(e.target.value as FlashcardsListSort);
    },
    [onSortChange]
  );

  return (
    <header
      className="flex flex-wrap items-center gap-4 border-b pb-4"
      role="search"
      aria-label="Filtry i sortowanie fiszek"
    >
      <input
        type="search"
        placeholder="Szukaj..."
        value={searchQuery}
        onChange={handleSearchChange}
        disabled={disabled}
        maxLength={SEARCH_MAX_LENGTH}
        aria-label="Szukaj fiszek"
        className={cn(inputBase, "min-w-[200px] flex-1 max-w-sm placeholder:text-muted-foreground")}
      />
      <select
        value={sourceFilter ?? ""}
        onChange={handleSourceChange}
        disabled={disabled}
        aria-label="Filtr źródła"
        className={cn(inputBase, "min-w-[140px]")}
      >
        {SOURCE_OPTIONS.map((opt) => (
          <option key={opt.value || "all"} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <select
        value={sort}
        onChange={handleSortChange}
        disabled={disabled}
        aria-label="Sortowanie"
        className={cn(inputBase, "min-w-[180px]")}
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </header>
  );
}
