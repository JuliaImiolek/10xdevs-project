# API Endpoint Implementation Plan: GET /generations

## 1. Przegląd punktu końcowego

Endpoint **GET `/generations`** służy do pobrania listy rekordów generacji (z tabeli `generations`) należących do zalogowanego użytkownika. Zwraca paginowaną listę rekordów wraz z metadanymi paginacji. Obsługuje opcjonalne parametry zapytania: `page`, `limit`, `sort` oraz `filter`, umożliwiając sortowanie i filtrowanie po metadanych (np. model, data, długość tekstu źródłowego). Tabela `generations` nie zawiera kolumny „status” — sortowanie odbywa się po polach takich jak `created_at`, `updated_at`, `model`, `generation_duration`. Endpoint wymaga uwierzytelnienia; zwraca **200 OK** z danymi, **400** przy nieprawidłowych parametrach, **401** przy braku autoryzacji oraz **500** przy błędach serwera.

## 2. Szczegóły żądania

- **Metoda HTTP:** GET
- **Struktura URL:** `/api/generations` (plik `src/pages/api/generations.ts` — handler `GET` obok istniejącego `POST`)
- **Parametry zapytania (wszystkie opcjonalne):**
  - **`page`** (number): numer strony (1-based). Domyślnie: `1`. Wymaga wartości ≥ 1.
  - **`limit`** (number): liczba rekordów na stronę. Domyślnie: np. `20`. Zalecany maksimum: `100` (ograniczenie wydajności i nadużyć).
  - **`sort`** (string): kryterium i kierunek sortowania. Dozwolone wartości: `created_at`, `created_at_desc`, `updated_at`, `updated_at_desc`, `model`, `model_desc`, `generation_duration`, `generation_duration_desc`. Domyślnie: `created_at_desc` (najnowsze pierwsze). Kolumna „status” nie istnieje w schemacie — nie udostępniać sortowania po „status”.
  - **`filter`** (kryteria na podstawie metadanych): realizowane jako oddzielne parametry zapytania (prostsze i bardziej RESTful niż jeden JSON):
    - **`model`** (string, opcjonalny): dokładna nazwa modelu (np. `openrouter/default`).
    - **`created_after`** (string, opcjonalny): data ISO 8601 — tylko generacje po tej dacie (włącznie).
    - **`created_before`** (string, opcjonalny): data ISO 8601 — tylko generacje przed tą datą (włącznie).
    - **`source_text_length_min`** (number, opcjonalny): minimalna wartość `source_text_length` (zakres w DB: 1000–10000).
    - **`source_text_length_max`** (number, opcjonalny): maksymalna wartość `source_text_length`.
- **Request Body:** brak (GET).

## 3. Wykorzystywane typy

- **PaginationDto** (`src/types.ts`) — już istnieje: `{ page: number; limit: number; total: number }`. Używane w odpowiedzi listy.
- **Generation** (`src/types.ts`) — alias wiersza tabeli `generations` z `database.types`. Zawiera wszystkie pola: `id`, `user_id`, `model`, `generated_count`, `accepted_unedited_count`, `accepted_edited_count`, `source_text_hash`, `source_text_length`, `generation_duration`, `created_at`, `updated_at`.
- **GenerationListItemDto** (do dodania w `src/types.ts`): reprezentacja pojedynczego rekordu generacji w odpowiedzi listy. Zalecane pola (spójne z tabelą, bez pomijania wrażliwych — `user_id` można zwracać dla spójności z GET `/generations/{id}`):
  - `id`, `user_id`, `model`, `generated_count`, `accepted_unedited_count`, `accepted_edited_count`, `source_text_hash`, `source_text_length`, `generation_duration`, `created_at`, `updated_at`
  - Typ: `Pick<Generation, "id" | "user_id" | "model" | "generated_count" | "accepted_unedited_count" | "accepted_edited_count" | "source_text_hash" | "source_text_length" | "generation_duration" | "created_at" | "updated_at">` lub alias całego `Generation` jeśli zawsze zwracamy pełny wiersz.
- **GenerationsListResponseDto** (do dodania w `src/types.ts`): `{ data: GenerationListItemDto[]; pagination: PaginationDto }`.
- **Query / Command:** parametry GET walidowane przez Zod w endpoincie; zmapowane na opcje przekazywane do serwisu (np. `page`, `limit`, `sortBy`, `sortOrder`, `filter: { model?, created_after?, created_before?, source_text_length_min?, source_text_length_max? }`). Oddzielny „command” typ opcjonalny; można użyć typu wynikowego ze schemy Zod.

## 4. Szczegóły odpowiedzi

- **Sukces (200 OK):** body w formacie:

```json
{
  "data": [
    {
      "id": 1,
      "user_id": "uuid",
      "model": "openrouter/default",
      "generated_count": 5,
      "accepted_unedited_count": null,
      "accepted_edited_count": 0,
      "source_text_hash": "abc123",
      "source_text_length": 2500,
      "generation_duration": 1200,
      "created_at": "2026-01-30T12:00:00Z",
      "updated_at": "2026-01-30T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42
  }
}
```

- **Nagłówki:** `Content-Type: application/json`.
- **Kody błędów:** 400 (nieprawidłowe parametry), 401 (brak uwierzytelnienia), 500 (błąd serwera) — szczegóły w sekcji 6.

## 5. Przepływ danych

1. **Żądanie:** Klient wysyła GET na `/api/generations` z opcjonalnymi parametrami zapytania.
2. **Middleware:** Astro ustawia `locals.supabase`. Identyfikator użytkownika: do czasu pełnego auth — `DEFAULT_USER_ID` z `src/db/supabase.client.ts` (spójnie z POST `/generations` i POST `/flashcards`); docelowo z sesji Supabase (np. `locals.userId`). Brak użytkownika → **401**.
3. **Endpoint (GET handler):**
   - Odczyt parametrów z `request.url` (URLSearchParams).
   - Walidacja Zod: `page` (int ≥ 1), `limit` (int, 1–100), `sort` (enum dozwolonych wartości), opcjonalne filtry (`model`, `created_after`, `created_before`, `source_text_length_min`, `source_text_length_max`) z odpowiednimi typami i zakresami. Nieprawidłowe parametry → **400** z czytelnym komunikatem.
   - Wywołanie serwisu: `listGenerations(supabase, userId, { page, limit, sort, filter })`.
4. **Serwis (`src/lib/services/generation.service.ts`):**
   - Zapytanie do Supabase: `from('generations').select('*', { count: 'exact', head: false })`.
   - Filtr: `.eq('user_id', userId)` (wymóg autoryzacji).
   - Zastosowanie filtrów opcjonalnych: `.eq('model', filter.model)`, `.gte('created_at', filter.created_after)`, `.lte('created_at', filter.created_before)`, `.gte('source_text_length', filter.source_text_length_min)`, `.lte('source_text_length', filter.source_text_length_max)` (tylko gdy podane).
   - Sortowanie: mapowanie wartości `sort` na kolumnę i kierunek (np. `created_at_desc` → `created_at`, `desc`); `.order(column, { ascending })`.
   - Paginacja: `.range((page - 1) * limit, page * limit - 1)` (Supabase range jest zero-based, włącznie z końcem).
   - Wykonanie zapytania; odczyt `count` z odpowiedzi Supabase dla `total`.
   - Mapowanie wierszy na `GenerationListItemDto[]` (lub bezpośrednio wiersze są zgodne z typem).
   - Zwrot: `{ data, pagination: { page, limit, total } }`.
5. **Odpowiedź:** Endpoint zwraca **200** z body `GenerationsListResponseDto`. W razie błędu bazy lub serwisu — **500**; przy braku autoryzacji — **401**. Tabela `generation_error_logs` **nie** jest używana w tym endpoincie (dotyczy tylko błędów AI w POST `/generations`).

## 6. Względy bezpieczeństwa

- **Uwierzytelnienie:** Endpoint dostępny tylko dla zalogowanego użytkownika. Obecnie: `DEFAULT_USER_ID` z konfiguracji; docelowo: weryfikacja sesji Supabase i ustawienie `user_id` — brak sesji → **401 Unauthorized**.
- **Autoryzacja:** Zawsze filtrowanie po `user_id` z kontekstu (nigdy z parametrów). Żadnych danych innych użytkowników. Row Level Security (RLS) na tabeli `generations` powinno dodatkowo wymuszać dostęp tylko do własnych wierszy.
- **Walidacja wejścia:** Zod dla wszystkich parametrów zapytania: ograniczenie zakresów (`page` ≥ 1, `limit` 1–100), whitelist dla `sort`, walidacja dat (ISO 8601) i liczb dla filtrów — zapobiega injection i nieprawidłowym zapytaniom.
- **Ekspozycja danych:** Zwracane rekordy zawierają `source_text_hash` (nie sam tekst) — akceptowalne; `user_id` można zwracać dla spójności z GET `/generations/{id}` (i tak jest to użytkownik bieżący).

## 7. Obsługa błędów

| Scenariusz | Kod HTTP | Body (przykład) |
|------------|----------|------------------|
| Nieprawidłowe parametry (np. `page=0`, `limit=200`, nieprawidłowy `sort`, zła data w filtrze) | 400 | `{ "error": "Bad Request", "message": "Invalid query parameters", "details": { "page": ["Page must be at least 1"] } }` |
| Brak uwierzytelnienia (docelowo: brak sesji) | 401 | `{ "error": "Unauthorized", "message": "Authentication required" }` |
| Błąd bazy danych / serwisu (np. timeout, błąd Supabase) | 500 | `{ "error": "Internal Server Error", "message": "Failed to list generations" }` |
| Sukces | 200 | `{ "data": [ ... ], "pagination": { "page", "limit", "total" } }` |

Nie używać tabeli `generation_error_logs` w GET `/generations`. Błędy logować w aplikacji (np. `console.error`) bez ujawniania wewnętrznych szczegółów w odpowiedzi 500.

## 8. Rozważania dotyczące wydajności

- **Limit `limit`:** Maksymalna wartość (np. 100) ogranicza rozmiar odpowiedzi i obciążenie bazy. Domyślne `limit` (np. 20) zmniejsza transfer.
- **Paginacja:** Użycie `.range()` i `count: 'exact'` w Supabase — jeden round-trip; unikać pobierania całej tabeli. Dla bardzo dużych `total` rozważyć szacowanie `total` (np. bez `count: 'exact'`) w przyszłości, jeśli zapytania z count staną się wolne.
- **Indeksy:** Tabela `generations` powinna mieć indeks na `user_id` (główny filtr). Indeksy złożone (np. `(user_id, created_at)`) przyspieszą sortowanie po dacie. Filtry po `model`, `created_at`, `source_text_length` korzystają z indeksu lub sekwencyjnego skanu w zależności od schemy — założyć indeks na `(user_id, created_at)`.
- **Czas odpowiedzi:** Zależny od rozmiaru strony i liczby wierszy użytkownika; dla typowych rozmiarów (< 1000 rekordów, limit 20) oczekiwany czas < 500 ms.

## 9. Etapy wdrożenia

1. **Typy w `src/types.ts`:**
   - Zdefiniować **GenerationListItemDto** (np. `Pick<Generation, "id" | "user_id" | "model" | "generated_count" | "accepted_unedited_count" | "accepted_edited_count" | "source_text_hash" | "source_text_length" | "generation_duration" | "created_at" | "updated_at">` lub alias do `Generation`).
   - Zdefiniować **GenerationsListResponseDto**: `{ data: GenerationListItemDto[]; pagination: PaginationDto }`.

2. **Schemat Zod w endpoincie (lub współdzielony moduł):**
   - Query schema: `page` (number, min 1, default 1), `limit` (number, min 1, max 100, default 20), `sort` (enum dozwolonych wartości, default `created_at_desc`), opcjonalne: `model` (string), `created_after` (string datetime ISO), `created_before` (string datetime ISO), `source_text_length_min` (number, 1000–10000), `source_text_length_max` (number, 1000–10000). Przekształcić query string na obiekt (np. `Object.fromEntries(url.searchParams)`) i walidować; dla brakujących parametrów stosować wartości domyślne.

3. **Serwis `generation.service.ts`:**
   - Dodać funkcję **`listGenerations(supabase, userId, options)`** przyjmującą `{ page, limit, sort, filter }`.
   - Zbudować zapytanie Supabase: select `*`, `count: 'exact'`, filtr `user_id`, opcjonalne filtry, `.order()` według mapowania `sort`, `.range()` dla paginacji.
   - Zwracać typ: `{ success: true; data: GenerationsListResponseDto } | { success: false; errorMessage: string }`.
   - Użyć typu `SupabaseClient` z `src/db/supabase.client.ts`.

4. **Endpoint GET w `src/pages/api/generations.ts`:**
   - Dodać eksport **`export const GET: APIRoute`**.
   - Sprawdzić metodę żądania (GET obsługiwany tylko w tym handlerze).
   - Sparsować URL i wyciągnąć parametry zapytania; walidować Zod; przy błędzie zwrócić **400** z `details`.
   - Pobrać `user_id` (obecnie `DEFAULT_USER_ID`); brak → **401**.
   - Wywołać `listGenerations(supabase, user_id, parsed)`.
   - Przy sukcesie: **200** z body `result.data`.
   - Przy błędzie: **500** z ogólnym komunikatem.
   - Zachować istniejący `POST` bez zmian. Ustawić `export const prerender = false` (już obecne).

5. **Testy i weryfikacja:**
   - Ręcznie lub testem: GET bez parametrów (domyślna strona, limit, sort).
   - GET z `page=2`, `limit=10`, `sort=created_at`.
   - GET z filtrami: `model=openrouter/default`, `created_after=2026-01-01T00:00:00Z`.
   - Nieprawidłowe parametry (np. `page=0`, `limit=1000`) → 400.
   - Docelowo: brak sesji → 401.

6. **Dokumentacja i lint:**
   - Upewnić się, że komentarze w endpoincie i serwisie opisują GET oraz parametry. Uruchomić linter i poprawić ewentualne błędy.
