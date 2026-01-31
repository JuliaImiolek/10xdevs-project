#!/usr/bin/env node
/**
 * check-mvp — Reports MVP status against PRD user stories (AI Flashcards).
 * Run: node scripts/check-mvp.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function exists(...segments) {
  return fs.existsSync(path.join(root, ...segments));
}

function fileContains(filePath, substring) {
  if (!fs.existsSync(filePath)) return false;
  return fs.readFileSync(filePath, "utf8").includes(substring);
}

const checks = [
  // US-001: AI flashcard generation
  {
    id: "US-001",
    name: "Generowanie fiszek przez AI",
    items: [
      { name: "Text input 1000–10000 znaków", ok: () => fileContains(path.join(root, "src/components/generate/TextInputArea.tsx"), "1000") && fileContains(path.join(root, "src/components/generate/TextInputArea.tsx"), "10000") },
      { name: "Strona /generate + widok generowania", ok: () => exists("src/pages/generate.astro") && exists("src/components/generate/FlashcardGenerationView.tsx") },
      { name: "API generacji (LLM)", ok: () => exists("src/pages/api/generations.ts") && exists("src/lib/services/openrouter.service.ts") },
      { name: "Lista propozycji, akceptacja/edycja/odrzucenie", ok: () => exists("src/components/generate/FlashcardList.tsx") && exists("src/components/generate/BulkSaveButton.tsx") },
      { name: "Walidacja front 200 / back 500", ok: () => fileContains(path.join(root, "src/pages/api/flashcards.ts"), "max(200") && fileContains(path.join(root, "src/pages/api/flashcards.ts"), "max(500") },
    ],
  },
  // US-002: Manual creation
  {
    id: "US-002",
    name: "Ręczne tworzenie fiszek",
    items: [
      { name: "Formularz ręczny (przód/tył)", ok: () => exists("src/components/generate/ManualFlashcardForm.tsx") },
      { name: "POST /api/flashcards (tworzenie)", ok: () => fileContains(path.join(root, "src/pages/api/flashcards.ts"), "createFlashcards") },
    ],
  },
  // US-003 & US-007: List, search, pagination, edit, delete
  {
    id: "US-003 / US-007",
    name: "Lista fiszek, wyszukiwanie, paginacja, edycja, usuwanie",
    items: [
      { name: "Strona /flashcards + widok listy", ok: () => exists("src/pages/flashcards.astro") && exists("src/components/flashcards/FlashcardsView.tsx") },
      { name: "Wyszukiwarka i filtry (Toolbar)", ok: () => exists("src/components/flashcards/Toolbar.tsx") },
      { name: "Paginacja", ok: () => exists("src/components/flashcards/Pagination.tsx") },
      { name: "Edycja (modal)", ok: () => exists("src/components/flashcards/EditFlashcardModal.tsx") },
      { name: "Usuwanie (dialog)", ok: () => exists("src/components/flashcards/DeleteConfirmDialog.tsx") },
      { name: "GET/PUT/DELETE /api/flashcards", ok: () => exists("src/pages/api/flashcards.ts") && exists("src/pages/api/flashcards/[id].ts") },
    ],
  },
  // US-004: Review AI proposals
  {
    id: "US-004",
    name: "Recenzja propozycji AI",
    items: [
      { name: "Widok recenzji w /generate (lista + zapis zbiorczy)", ok: () => exists("src/components/generate/FlashcardList.tsx") && exists("src/components/generate/BulkSaveButton.tsx") },
    ],
  },
  // US-005: Account management
  {
    id: "US-005",
    name: "Zarządzanie kontem i uwierzytelnianie",
    items: [
      { name: "Strony auth (login, register, forgot, reset)", ok: () => exists("src/pages/auth/login.astro") && exists("src/pages/auth/register.astro") && exists("src/pages/auth/forgot-password.astro") && exists("src/pages/auth/reset-password.astro") },
      { name: "API auth (login, logout, register, change-password, delete-account)", ok: () => exists("src/pages/api/auth/login.ts") && exists("src/pages/api/auth/logout.ts") && exists("src/pages/api/auth/register.ts") && exists("src/pages/api/auth/change-password.ts") && exists("src/pages/api/auth/delete-account.ts") },
      { name: "Ustawienia konta (zmiana hasła, usunięcie)", ok: () => exists("src/pages/account.astro") && exists("src/components/auth/AccountSettingsView.tsx") },
      { name: "Middleware (ochrona tras)", ok: () => exists("src/middleware/index.ts") && fileContains(path.join(root, "src/middleware/index.ts"), "PROTECTED_PATHS") },
    ],
  },
  // US-006: Secure access / authorization
  {
    id: "US-006",
    name: "Bezpieczny dostęp i autoryzacja",
    items: [
      { name: "user_id w zapytaniach (izolacja danych)", ok: () => fileContains(path.join(root, "src/lib/services/flashcard.service.ts"), "user_id") || fileContains(path.join(root, "src/pages/api/flashcards.ts"), "userId") },
      { name: "RLS w Supabase (opcjonalnie)", ok: () => {
        const migration = path.join(root, "supabase/migrations/20250130120003_disable_rls_policies.sql");
        return exists("supabase/migrations") && (fileContains(migration, "disable row level security") ? "disabled" : true);
      } },
    ],
  },
  // Session / Spaced repetition (PRD: integracja z algorytmem powtórek)
  {
    id: "Session / SRS",
    name: "Sesja powtórek i algorytm spaced repetition",
    items: [
      { name: "Strona sesji /session", ok: () => exists("src/pages/session.astro") && exists("src/components/session/SessionView.tsx") },
      { name: "Algorytm SRS (np. SM-2) lub biblioteka", ok: () => {
        const files = ["src/components/session/SessionView.tsx", "src/components/hooks/useSessionFlashcards.ts", "src/db/database.types.ts"];
        let content = "";
        for (const f of files) {
          const full = path.join(root, f);
          if (fs.existsSync(full)) content += fs.readFileSync(full, "utf8");
        }
        return /next_review|review_interval|sm-2|sm2|spacedRepetition/.test(content);
      } },
    ],
  },
  // Logging & validation
  {
    id: "PRD",
    name: "Logowanie błędów generacji i walidacja",
    items: [
      { name: "Tabela i API generation_error_logs", ok: () => exists("src/pages/api/generation-error-logs.ts") && exists("supabase/migrations/20250130120002_create_generation_error_logs_table.sql") },
      { name: "Walidacja Zod (API)", ok: () => fileContains(path.join(root, "src/pages/api/flashcards.ts"), "z.object") || fileContains(path.join(root, "src/pages/api/generations.ts"), "zod") },
    ],
  },
];

// Normalize US-006 RLS check (returns true/false/"disabled")
function runItem(item) {
  const result = item.ok();
  if (result === "disabled") return { ok: false, note: "RLS wyłączone (autoryzacja po stronie aplikacji)" };
  return { ok: !!result };
}

console.log("\n=== MVP Status (check-mvp) ===\n");
console.log("Projekt: 10x-cards (AI Flashcards) — PRD: .ai/prd.md\n");

let totalOk = 0;
let totalItems = 0;

for (const group of checks) {
  console.log(`--- ${group.id}: ${group.name} ---`);
  for (const item of group.items) {
    const { ok, note } = runItem(item);
    totalItems++;
    if (ok) totalOk++;
    const icon = ok ? "✓" : "✗";
    const line = note ? `${icon} ${item.name} (${note})` : `${icon} ${item.name}`;
    console.log(line);
  }
  console.log("");
}

const pct = totalItems ? Math.round((100 * totalOk) / totalItems) : 0;
console.log("--- Podsumowanie ---");
console.log(`${totalOk}/${totalItems} kryteriów spełnionych (${pct}%)`);
console.log("");
