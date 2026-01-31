# Plan: US-006 (izolacja user_id) + Sesja / SRS (SM-2)

Plan uzupełnienia brakujących elementów zgodnie z PRD, auth-spec, session-view-implementation-plan i db-plan.

---

## 1. US-006: Bezpieczny dostęp — user_id w zapytaniach (izolacja danych)

### Stan obecny
- **RLS**: Wyłączone w migracji `20250130120003_disable_rls_policies.sql`. Autoryzacja po stronie aplikacji (middleware + `user_id` w zapytaniach) — zgodnie z decyzją projektu.
- **Middleware**: Ustawia `context.locals.userId` z sesji Supabase; chronione ścieżki (`/generate`, `/flashcards`, `/session`, `/account`) przekierowują niezalogowanych na `/auth/login`. Ścieżki API (`/api/*`) nie są przekierowywane — handler zwraca 401, gdy `!locals.userId`.
- **API**: Wszystkie endpointy fiszek i generacji już używają `locals.userId` i przekazują go do serwisów; serwisy filtrują po `.eq("user_id", userId)`.

### Co zrobić (weryfikacja / ewentualne usprawnienia)
1. **Audit**  
   Upewnić się, że **żaden** endpoint nie przyjmuje `user_id` z body ani z query — źródłem `userId` jest wyłącznie `context.locals.userId` (ustawiane w middleware z sesji).
2. **Decyzja**: Zostajemy przy 401 zwracanym w handlerach (bez 401 z middleware dla API).
3. **Dokumentacja**: W `.ai/auth-spec.md` lub w komentarzu w middleware krótko potwierdzić, że izolacja danych opiera się na `user_id` w zapytaniach (serwisy) i że RLS jest wyłączone.

**Wynik**: US-006 „user_id w zapytaniach” zostanie potwierdzone i ewentualnie udokumentowane; RLS pozostaje wyłączone.

---

## 2. Session / SRS — Strona sesji + algorytm SRS (SM-2)

### Stan obecny
- **Strona `/session`**: Istnieje (`src/pages/session.astro`, `SessionView` + `SessionProgress`, `SessionCard`, `SessionControls`, `SessionSummary`). Sesja to **proste przewijanie kart** (lista z GET `/api/flashcards`, limit 50, sort `created_at_desc`): użytkownik klika „Pokaż odpowiedź”, ocenia (Źle / Średnio / Dobrze), przechodzi do następnej karty. **Brak**: `next_review`, interwałów, biblioteki SRS — oceny nie są zapisywane ani używane do planowania powtórek.

### Cel (zgodnie z PRD)
- PRD: *„Integracja z gotowym algorytmem powtórek opartym na bibliotece open-source”* oraz *„Nie opracowujemy własnego, zaawansowanego algorytmu”*.
- Sesja ma pokazywać karty **do powtórki** (np. `next_review_at <= now()` lub nigdy nie powtarzane), a po ocenie — zapisywać wynik w algorytmie (np. SM-2) i aktualizować `next_review_at` / interwał.

### Proponowane kroki

#### 2.1. Biblioteka SRS (SM-2)
- Zainstalować bibliotekę **`supermemo`** (npm) — dojrzała implementacja SM-2 z typami TypeScript; wejście: ocena 0–5, poprzedni `interval`, `repetition`, `efactor`; wyjście: nowy `interval`, `repetition`, `efactor`, `nextReview` (Date).
- Alternatywa: `@open-spaced-repetition/sm-2` lub inna biblioteka open-source — wybór po sprawdzeniu API i zgodności z naszym modelem danych.

#### 2.2. Schemat bazy (kolumny SRS w `flashcards`)
Dodać kolumny potrzebne do SM-2 (np. zgodne z `supermemo`):

- `next_review_at` — timestamptz, nullable (NULL = nigdy nie powtarzana / zawsze „due”).
- `interval_days` — integer, domyślnie 0 (dni do następnej powtórki).
- `repetitions` — integer, domyślnie 0 (liczba kolejnych poprawnych odpowiedzi).
- `ease_factor` — numeric(6,4), domyślna wartość początkowa SM-2 (np. 2.5).

**Migracja**: Nowy plik w `supabase/migrations/`, np. `YYYYMMDDHHMMSS_add_flashcards_srs_columns.sql`:  
`ALTER TABLE public.flashcards ADD COLUMN ...`, z komentarzami i bez włączania RLS (RLS pozostaje wyłączone).

Po migracji zaktualizować `src/db/database.types.ts` (ręcznie lub przez `supabase gen types`).

#### 2.3. Typy i DTO
- W `src/types.ts`: rozszerzyć `FlashcardDto` (lub dodać opcjonalne pola SRS dla sesji) o `next_review_at`, `interval_days`, `repetitions`, `ease_factor` (opcjonalnie — tylko tam, gdzie API je zwraca).
- Typy wejścia/wyjścia dla `supermemo`: np. interfejs `SrsState` i funkcja `scheduleReview(grade, state) => newState`.

#### 2.4. Backend: lista fiszek „do powtórki” i zapis wyniku
- **GET lista do sesji**:  
  **Zastosowano:** rozszerzenie GET `/api/flashcards` o parametr query `?forSession=true` (prościej niż osobny endpoint). Serwis `listFlashcardsForSession` filtruje `next_review_at IS NULL OR next_review_at <= now()`, sort po `next_review_at ASC NULLS FIRST`, limit. Zapytanie z `.eq("user_id", userId)` (izolacja US-006).
- **Zapis wyniku oceny**:  
  Nowy endpoint np. `POST /api/flashcards/[id]/review` (lub `PATCH /api/flashcards/[id]` z polem `review`) z body: `{ grade: number }` (0–5 lub 1–3 mapowane na 0–5).  
  Handler: pobiera bieżącą fiszkę (po `userId` + `id`), wywołuje SM-2 (np. `supermemo(grade, { interval, repetition, efactor })`), oblicza `next_review_at = now() + interval_days`, aktualizuje w DB: `next_review_at`, `interval_days`, `repetitions`, `ease_factor`, `updated_at`.  
  Walidacja: `grade` w dozwolonym zakresie; fiszka musi należeć do użytkownika.

#### 2.5. Serwis (flashcard.service)
- `listFlashcardsForSession(supabase, userId, limit?)` — select gdzie `user_id = userId` AND (`next_review_at IS NULL` OR `next_review_at <= now()`), order `next_review_at ASC NULLS FIRST`, limit.
- `recordReview(supabase, userId, flashcardId, grade)` — get by id+userId; jeśli brak — 404; wywołanie SM-2; update row (next_review_at, interval_days, repetitions, ease_factor).

#### 2.6. Frontend — sesja
- **useSessionFlashcards**: Zamiast zwykłego GET `/api/flashcards` z `page=1, limit=50, sort=created_at_desc` — wywołać endpoint „sesyjny” (lista due): np. GET `/api/flashcards/session` lub GET `/api/flashcards?forSession=true&limit=50`. Używać zwracanej listy jako „karty do powtórki”.
- **SessionView**: Po wyborze oceny (handleRate) — oprócz przejścia do następnej karty wywołać `POST /api/flashcards/[id]/review` z `{ grade }`. Mapowanie UI (Źle / Średnio / Dobrze) na ocenę SM-2 (np. 1, 3, 5 lub 2, 4, 5 — do ustalenia). Obsługa błędów (np. 500) — toast lub komunikat bez przerywania sesji (opcjonalnie retry).
- **Nowe fiszki**: Fiszki nigdy nie powtarzane (`next_review_at IS NULL`) powinny trafiać do listy „due”; po pierwszej ocenie algorytm ustawi pierwszy interwał.

#### 2.7. Zachowanie wsteczne
- Istniejące fiszki bez kolumn SRS: po migracji kolumny mają wartości domyślne (np. `next_review_at = NULL`), więc będą traktowane jako „do powtórki” i pojawią się w sesji. To jest pożądane.

---

## 3. Kolejność implementacji (propozycja)

1. **US-006**  
   - Audit endpointów (brak `user_id` z requestu).  
   - Opcjonalnie: 401 z middleware dla chronionych `/api/*` przy braku sesji.  
   - Krótki wpis w auth-spec / komentarz.

2. **SRS — baza**  
   - Migracja: kolumny SRS w `flashcards`.  
   - Aktualizacja `database.types.ts` i typów w `src/types.ts`.

3. **SRS — biblioteka i logika**  
   - `npm install supermemo`.  
   - Moduł w `src/lib/srs.ts` (lub podobnie): wywołanie SM-2, mapowanie oceny UI → 0–5.

4. **SRS — backend**  
   - Lista due: `listFlashcardsForSession` + endpoint (GET session lub rozszerzenie GET flashcards).  
   - Zapis: `recordReview` + `POST /api/flashcards/[id]/review`.  
   - Wszystkie zapytania z `userId` z `locals`.

5. **SRS — frontend**  
   - Hook sesji pobiera listę „due”.  
   - SessionView po ocenie wywołuje POST review i przechodzi do następnej karty.

6. **Testy ręczne**  
   - Sesja z 0 fiszek, z fiszkami due, oceny Źle/Średnio/Dobrze; sprawdzenie że `next_review_at` i interwały się zmieniają; ponowna sesja pokazuje inne karty (np. nie due).

---

## 4. Podsumowanie

| Element | Działanie |
|--------|-----------|
| **US-006 user_id** | Audit + ewentualnie 401 w middleware + dokumentacja; RLS bez zmian. |
| **Strona /session** | Już jest; zostaje, z zmianą źródła danych na „fiszki due” i zapisem ocen. |
| **Algorytm SRS** | Biblioteka `supermemo` (SM-2); kolumny SRS w `flashcards`; endpoint review; sesja oparta na due + zapis oceny. |

Po zatwierdzeniu planu można przejść do implementacji krok po kroku.
