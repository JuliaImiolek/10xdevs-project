import * as React from "react";
import type { PaginationDto } from "@/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PaginationProps {
  pagination: PaginationDto;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

function getMaxPage(total: number, limit: number): number {
  if (limit <= 0) return 1;
  return Math.max(1, Math.ceil(total / limit));
}

export function Pagination({
  pagination,
  onPageChange,
  disabled = false,
}: PaginationProps) {
  const { page, limit, total } = pagination;
  const maxPage = getMaxPage(total, limit);
  const canPrev = page > 1;
  const canNext = page < maxPage;

  const handlePrev = React.useCallback(() => {
    if (canPrev && page > 1) {
      onPageChange(page - 1);
    }
  }, [canPrev, page, onPageChange]);

  const handleNext = React.useCallback(() => {
    if (canNext && page < maxPage) {
      onPageChange(page + 1);
    }
  }, [canNext, page, maxPage, onPageChange]);

  return (
    <nav
      className="flex items-center justify-between gap-4 border-t pt-4"
      aria-label="Nawigacja stron"
    >
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Strona {page} z {maxPage}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handlePrev}
          disabled={disabled || !canPrev}
          aria-label="Poprzednia strona"
        >
          Poprzednia
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleNext}
          disabled={disabled || !canNext}
          aria-label="Następna strona"
        >
          Następna
        </Button>
      </div>
    </nav>
  );
}
