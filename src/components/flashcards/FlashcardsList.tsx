import * as React from "react";
import type { FlashcardDto, PaginationDto } from "@/types";
import { FlashcardListCard } from "./FlashcardListCard";
import { Pagination } from "./Pagination";
import { Skeleton } from "@/components/ui/skeleton";

export interface FlashcardsListProps {
  flashcards: FlashcardDto[];
  pagination: PaginationDto;
  loading: boolean;
  error: string | null;
  onEdit: (f: FlashcardDto) => void;
  onDelete: (f: FlashcardDto) => void;
  onPageChange: (page: number) => void;
  /** Gdy true i lista pusta – komunikat „Brak wyników wyszukiwania” zamiast „Brak fiszek”. */
  emptyDueToSearch?: boolean;
}

function ListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border py-6 shadow-sm">
          <div className="px-6 pb-2">
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="space-y-2 px-6">
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="mt-4 flex gap-2 px-6">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-14" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FlashcardsList({
  flashcards,
  pagination,
  loading,
  error,
  onEdit,
  onDelete,
  onPageChange,
  emptyDueToSearch = false,
}: FlashcardsListProps) {
  if (loading) {
    return (
      <section aria-label="Lista fiszek" className="mt-6">
        <ListSkeleton />
      </section>
    );
  }

  if (error) {
    return (
      <section aria-label="Lista fiszek" className="mt-6">
        <p className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      </section>
    );
  }

  if (flashcards.length === 0) {
    return (
      <section aria-label="Lista fiszek" className="mt-6">
        <p className="text-muted-foreground text-center py-8">
          {emptyDueToSearch ? (
            "Brak wyników wyszukiwania."
          ) : (
            <>
              Brak fiszek.{" "}
              <a href="/generate" className="text-primary underline hover:no-underline">
                Wygeneruj fiszki
              </a>
              .
            </>
          )}
        </p>
        <Pagination
          pagination={pagination}
          onPageChange={onPageChange}
          disabled={true}
        />
      </section>
    );
  }

  return (
    <section aria-label="Lista fiszek" className="mt-6">
      <ul className="space-y-4 list-none p-0 m-0">
        {flashcards.map((f) => (
          <li key={f.id}>
            <FlashcardListCard
              flashcard={f}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </li>
        ))}
      </ul>
      <Pagination
        pagination={pagination}
        onPageChange={onPageChange}
      />
    </section>
  );
}
