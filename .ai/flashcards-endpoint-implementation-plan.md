# API Endpoint Implementation Plan: POST /flashcards

## 1. Przegląd punktu końcowego

Endpoint **POST `/flashcards`** służy do tworzenia jednej lub wielu fiszek. Wspiera tworzenie zbiorcze (bulk) oraz fiszki wygenerowane przez AI (warianty `ai-full` i `ai-edited`) oraz ręczne (`manual`). Po walidacji payloadu żądanie jest przekazywane do serwisu, który zapisuje rekordy w tabeli `flashcards` z przypisaniem `user_id` (z sesji lub, do czasu wdrożenia auth, z `DEFAULT_USER_ID`). Odpowiedź zwraca tablicę utworzonych fiszek w formacie DTO z kodami 201 (sukces) lub 400 (błąd walidacji), 401 (brak autoryzacji), 500 (błąd serwera).

## 2. Szczegóły żądania

- **Metoda HTTP:** POST
- **Struktura URL:** `/api/flashcards` (Astro: plik `src/pages/api/flashcards.ts` obsługuje ścieżkę `/api/flashcards` dla metody POST)
- **Parametry:**
  - **Wymagane:** brak (wszystkie dane w body)
  - **Opcjonalne:** brak
- **Request Body:** JSON z polem `flashcards` — tablica obiektów; każdy element musi zawierać:
  - `front` (string, wymagane, max 200 znaków)
  - `back` (string, wymagane, max 500 znaków)
  - `source` (string, wymagane: `"manual"` | `"ai-full"` | `"ai-edited"`)
  - `generation_id` (number | null): wymagane dla `ai-full` i `ai-edited`; musi być `null` dla `manual`

Przykład:

```json
{
  "flashcards": [
    {
      "front": "Question 1",
      "back": "Answer 1",
      "source": "manual",
      "generation_id": null
    },
    {
      "front": "Question 2",
      "back": "Answer 2",
      "source": "ai-full",
      "generation_id": 123
    }
  ]
}
```

## 3. Wykorzystywane typy

- **FlashcardCreateDto** (`src/types.ts`) — pojedyncza fiszka do utworzenia: `front`, `back`, `source`, `generation_id`.
- **FlashcardsCreateCommand** (`src/types.ts`) — komenda żądania: `{ flashcards: FlashcardCreateDto[] }`.
- **FlashcardDto** (`src/types.ts`) — format odpowiedzi: `id`, `front`, `back`, `source`, `generation_id`, `created_at`, `updated_at` (zgodnie z `FlashcardDto` w types; w odpowiedzi spec zwraca też `created_at` bez `updated_at` — zaleca się zwracać pełny `FlashcardDto` dla spójności z GET).
- **FlashcardInsert** (z `src/db/database.types.ts` lub alias w `src/types.ts`) — typ wstawiania do Supabase: pola z API + `user_id`; `id`, `created_at`, `updated_at` opcjonalne (auto z bazy).
- **Source** (`src/types.ts`) — typ literalny `"ai-full" | "ai-edited" | "manual"` do walidacji Zod.

Żadne nowe typy DTO/Command nie są wymagane — istniejące w `src/types.ts` pokrywają specyfikację.

## 4. Szczegóły odpowiedzi

- **Sukces (201 Created):** body w formacie:

```json
{
  "flashcards": [
    {
      "id": 1,
      "front": "Question 1",
      "back": "Answer 1",
      "source": "manual",
      "generation_id": null,
      "created_at": "2026-01-30T12:00:00Z",
      "updated_at": "2026-01-30T12:00:00Z"
    }
  ]
}
```

Elementy tablicy są typu `FlashcardDto`. Kolejność zgodna z kolejnością wstawień (np. Supabase `.insert().select()` zwraca wstawione wiersze).

- **Nagłówki:** `Content-Type: application/json`.
- **Kody błędów:** 400, 401, 500 — patrz sekcja 6.

## 5. Przepływ danych

1. **Żądanie:** Klient wysyła POST na `/api/flashcards` z JSON body.
2. **Middleware:** Astro middleware ustawia `locals.supabase` (obecnie bez sprawdzania sesji; w przyszłości można dodać weryfikację tokena i ustawienie `locals.userId`).
3. **Endpoint (POST handler):**
   - Odczytanie body (`request.json()`); przy błędzie parsowania → 400.
   - Walidacja Zod schemy (tablica `flashcards`, reguły dla każdego elementu oraz zależność `source` ↔ `generation_id`); przy błędzie → 400 z czytelnym komunikatem.
   - Pobranie `user_id`: do czasu wdrożenia auth — `DEFAULT_USER_ID` z `src/db/supabase.client.ts` (spójnie z POST `/generations`); docelowo — z sesji Supabase Auth; brak użytkownika → 401.
   - Wywołanie serwisu `createFlashcards(supabase, user_id, parsed.data)`.
4. **Serwis (np. `src/lib/services/flashcard.service.ts`):**
   - Mapowanie każdego `FlashcardCreateDto` na obiekt wstawienia: `front`, `back`, `source`, `generation_id`, `user_id`. Uwaga: jeśli baza w kolumnie `source` oczekuje wartości wielkich liter (np. `MANUAL`, `AI-FULL`, `AI-EDITED` — zgodnie z db-plan), serwis powinien wykonać mapowanie; w przeciwnym razie użycie wartości z API (małe litery) jeśli DB to akceptuje.
   - Jedno wywołanie Supabase: `supabase.from('flashcards').insert(rows).select()` (bulk insert + zwrot wstawionych wierszy).
   - Mapowanie wierszy na `FlashcardDto[]` i zwrot do endpointu.
5. **Odpowiedź:** Endpoint zwraca 201 z body `{ flashcards: FlashcardDto[] }`. W razie błędu DB/serwisu — 500; przy braku autoryzacji — 401.

Tabela `generation_error_logs` nie jest używana przez POST `/flashcards` (dotyczy tylko błędów generacji AI w POST `/generations`).

## 6. Względy bezpieczeństwa

- **Uwierzytelnienie:** Endpoint musi operować w kontekście zalogowanego użytkownika. Obecnie: użycie `DEFAULT_USER_ID` z env; docelowo: weryfikacja sesji Supabase (np. `supabase.auth.getUser()` w middleware lub w endpoincie) i ustawienie `user_id` — brak sesji powinien skutkować **401 Unauthorized**.
- **Autoryzacja:** Wszystkie wstawiane fiszki muszą mieć `user_id` ustawione na identyfikator bieżącego użytkownika; nie przyjmować `user_id` z body. Row Level Security (RLS) w Supabase na tabeli `flashcards` powinno ograniczać dostęp do wierszy danego użytkownika.
- **Walidacja wejścia:** Zod z ograniczeniami długości (`front` ≤ 200, `back` ≤ 500) i enum `source` oraz reguła warunkowa dla `generation_id` — zapobiega nadmiernym danym i nieprawidłowym wartościom. Odrzuć nie-array lub pustą tablicę jeśli spec tego wymaga (w spec: „flashcards” array — rozsądnie wymagać co najmniej jednego elementu, aby uniknąć bezsensownego 201 z pustą listą; opcjonalnie można pozwolić na pustą tablicę i zwrócić 201 z `[]`).
- **Ograniczenie rozmiaru:** Rozsądny limit liczby elementów w `flashcards` (np. 5–100) zapobiega przeciążeniu i nadużyciom; przy przekroczeniu → 400.
- **generation_id:** Dla `ai-full` / `ai-edited` walidować, że `generation_id` jest liczbą (integer); opcjonalnie w serwisie sprawdzić istnienie rekordu w `generations` i przynależność do tego samego `user_id` — zapobiega podpinaniu cudzych generacji (jeśli RLS nie wymusza tego po stronie bazy).

## 7. Obsługa błędów

| Scenariusz | Kod HTTP | Body (przykład) |
|------------|----------|------------------|
| Nieprawidłowy JSON / brak body | 400 | `{ "error": "Bad Request", "message": "Invalid JSON body" }` |
| Błąd walidacji Zod (puste front/back, zła długość, zły source, niezgodność source/generation_id, brak lub nie-tablica `flashcards`) | 400 | `{ "error": "Validation Error", "message": "...", "details": { ... } }` |
| Brak uwierzytelnienia (docelowo: brak sesji) | 401 | `{ "error": "Unauthorized", "message": "Authentication required" }` |
| Błąd bazy danych / serwisu (np. FK violation, constraint) | 500 | `{ "error": "Internal Server Error", "message": "..." }` |
| Sukces | 201 | `{ "flashcards": [ FlashcardDto, ... ] }` |

Nie używać tabeli `generation_error_logs` w tym endpoincie. Błędy logować w aplikacji (np. `console.error` lub logger) bez ujawniania wewnętrznych szczegółów w odpowiedzi 500.

## 8. Rozważania dotyczące wydajności

- **Bulk insert:** Jedno `insert(rows).select()` zamiast wielu pojedynczych insertów — ogranicza liczbę round-tripów do bazy.
- **Limit rozmiaru tablicy:** Ograniczenie liczby fiszek w jednym żądaniu (np. max 50–100) zmniejsza ryzyko timeoutu i przeciążenia; przy większej liczbie klient może wysłać wiele żądań (z paginacją po stronie klienta).
- **Indeksy:** Tabela `flashcards` z `user_id` i ewentualnie `generation_id` — typowe zapytania (lista po user, filtrowanie po generation) powinny korzystać z indeksów; zakłada się, że są zdefiniowane w migracjach (db-plan).
- **Czas odpowiedzi:** Zależny od rozmiaru batcha i obciążenia Supabase; dla typowych rozmiarów (kilka–kilkadziesiąt fiszek) oczekiwany czas < 1 s.

## 9. Etapy wdrożenia

1. **Schemat Zod** — W pliku endpointu (lub współdzielonym module walidacji) zdefiniować schemat Zod:
   - `source`: `z.enum(["manual", "ai-full", "ai-edited"])`.
   - `front`: `z.string().min(1).max(200)`.
   - `back`: `z.string().min(1).max(500)`.
   - `generation_id`: `z.number().int().positive().nullable()`.
   - Reguła refin/superRefine: jeśli `source === "manual"` → `generation_id` musi być `null`; jeśli `source` in (`"ai-full"`, `"ai-edited"`) → `generation_id` musi być liczbą (nie null).
   - Obiekt pojedynczej fiszki i schemat główny: `z.object({ flashcards: z.array(...).min(1) })` (opcjonalnie `.max(100)`). Eksportować typ inferowany ze schemy dla użycia w serwisie.

2. **Serwis fiszek** — Dodać plik `src/lib/services/flashcard.service.ts`:
   - Funkcja `createFlashcards(supabase, userId, command: FlashcardsCreateCommand): Promise<CreateFlashcardsResult>`.
   - Typ wyniku: `{ success: true; data: { flashcards: FlashcardDto[] } }` lub `{ success: false; errorMessage: string }`.
   - W ciele: zmapować `command.flashcards` na tablicę obiektów Insert (`front`, `back`, `source`, `generation_id`, `user_id`). W razie gdy DB wymaga wielkich liter w `source`, mapować wartości (np. `manual` → `MANUAL`).
   - Wywołać `supabase.from('flashcards').insert(rows).select()`.
   - Przy sukcesie zmapować zwrócone wiersze na `FlashcardDto[]` i zwrócić `{ success: true, data: { flashcards } }`.
   - Przy błędzie (np. `error` z Supabase) zalogować i zwrócić `{ success: false, errorMessage: "..." }`. Nie zapisywać do `generation_error_logs`.

3. **Endpoint POST** — Dodać plik `src/pages/api/flashcards.ts`:
   - `export const prerender = false`.
   - Handler `POST`: parsowanie `await request.json()` w try/catch → przy wyjątku zwrot 400 z komunikatem o nieprawidłowym JSON.
   - Walidacja body przez schemat Zod; przy `!parsed.success` zwrot 400 z `error`, `message` i opcjonalnie `details` (flatten).
   - Pobranie `user_id`: na razie `DEFAULT_USER_ID` z `src/db/supabase.client`; docelowo z `locals` po ustawieniu przez middleware auth → przy braku zwrot 401.
   - Wywołanie `createFlashcards(locals.supabase, user_id, parsed.data)`.
   - Przy `result.success` zwrot 201 z `result.data` (body: `{ flashcards: result.data.flashcards }`).
   - Przy `!result.success` zwrot 500 z ogólnym komunikatem.

4. **Spójność z typami** — Upewnić się, że odpowiedź 201 zwraca obiekty zgodne z `FlashcardDto` (id, front, back, source, generation_id, created_at, updated_at). Jeśli Supabase zwraca `source` w innej formie (np. wielkie litery), zmapować w serwisie do wartości używanych w API (małe litery).

5. **Testy** — (Opcjonalnie) testy jednostkowe dla schematu Zod (wszystkie przypadki walidacji) oraz dla serwisu z mockowanym Supabase (sukces, błąd FK). Test ręczny: POST z prawidłowym body, pustą tablicą, nieprawidłowym source/generation_id, zbyt długim front/back — oczekiwane kody 201/400/500.

6. **Dokumentacja** — Zaktualizować listę endpointów w `.ai/api-plan.md` po wdrożeniu (np. doprecyzować czy pustą tablicę odrzucamy czy akceptujemy) oraz ewentualnie dodać przykład odpowiedzi z `updated_at` jeśli spec zostanie rozszerzony.
