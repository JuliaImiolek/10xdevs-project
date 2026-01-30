import * as React from "react";
import type { FlashcardDto } from "@/types";
import { useFlashcardsList } from "@/components/hooks/useFlashcardsList";
import { deleteFlashcard } from "@/lib/flashcards-api";
import { Toolbar } from "./Toolbar";
import { FlashcardsList } from "./FlashcardsList";
import { EditFlashcardModal } from "./EditFlashcardModal";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";

export default function FlashcardsView() {
  const {
    data,
    pagination,
    loading,
    error,
    refetch,
    page,
    setPage,
    sort,
    setSort,
    sourceFilter,
    setSourceFilter,
  } = useFlashcardsList();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [editingFlashcard, setEditingFlashcard] = React.useState<FlashcardDto | null>(null);
  const [deletingFlashcard, setDeletingFlashcard] = React.useState<FlashcardDto | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const filteredData = React.useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.trim().toLowerCase();
    return data.filter(
      (f) =>
        f.front.toLowerCase().includes(q) || f.back.toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  const handleEdit = React.useCallback((f: FlashcardDto) => {
    setEditingFlashcard(f);
  }, []);

  const handleDelete = React.useCallback((f: FlashcardDto) => {
    setDeleteError(null);
    setDeletingFlashcard(f);
  }, []);

  const handlePageChange = React.useCallback(
    (newPage: number) => {
      setPage(newPage);
    },
    [setPage]
  );

  const handleSaved = React.useCallback(
    (_updated: FlashcardDto) => {
      setEditingFlashcard(null);
      refetch();
    },
    [refetch]
  );

  const handleEditError = React.useCallback((message: string) => {
    setEditingFlashcard(null);
  }, []);

  const handleDeleteConfirm = React.useCallback(
    async (id: number) => {
      setDeleteError(null);
      setDeleteLoading(true);
      const result = await deleteFlashcard(id);
      setDeleteLoading(false);

      if (result.ok) {
        setDeletingFlashcard(null);
        refetch();
        return;
      }

      const err = result.error;
      if (err.status === 404) {
        setDeletingFlashcard(null);
        refetch();
        return;
      }
      setDeletingFlashcard(null);
      setDeleteError(err.message ?? "Wystąpił błąd. Spróbuj ponownie.");
    },
    [refetch]
  );

  return (
    <main role="main" aria-label="Moje fiszki" className="space-y-4">
      <h1 className="text-2xl font-semibold">Moje fiszki</h1>

      <Toolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sourceFilter={sourceFilter}
        onSourceFilterChange={setSourceFilter}
        sort={sort}
        onSortChange={setSort}
        disabled={loading}
      />

      {deleteError && (
        <p
          className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {deleteError}
        </p>
      )}

      <FlashcardsList
        flashcards={filteredData}
        pagination={pagination}
        loading={loading}
        error={error}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPageChange={handlePageChange}
        emptyDueToSearch={filteredData.length === 0 && searchQuery.trim().length > 0}
      />

      <EditFlashcardModal
        flashcard={editingFlashcard}
        onClose={() => setEditingFlashcard(null)}
        onSaved={handleSaved}
        onError={handleEditError}
      />

      <DeleteConfirmDialog
        flashcard={deletingFlashcard}
        onClose={() => setDeletingFlashcard(null)}
        onConfirm={handleDeleteConfirm}
        loading={deleteLoading}
      />
    </main>
  );
}
