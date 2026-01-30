# API Endpoint Implementation Plan: GET /generation-error-logs

## 1. Przegląd punktu końcowego

Endpoint **GET `/generation-error-logs`** służy do pobrania listy wpisów z logów błędów generacji AI fiszek (tabela `generation_error_logs`). Zwraca obiekt JSON zawierający tablicę wpisów logów oraz opcjonalnie metadane paginacji. Endpoint wymaga uwierzytelnienia. Zgodnie ze specyfikacją: użytkownik widzi wyłącznie swoje wpisy (filtrowanie po `user_id`); jeśli w przyszłości dostęp zostanie ograniczony wyłącznie do administratorów, użytkownik niebędący adminem otrzyma **403 Forbidden**. Sukces: **200 OK** z tablicą wpisów; **401** przy nieprawidłowym lub brakującym tokenie; **403** gdy dostęp jest zarezerwowany dla administratorów; **500** przy błędach serwera.

## 2. Szczegóły żądania

- **Metoda HTTP:** GET
- **Struktura URL:** `/api/generation-error-logs` — plik `src/pages/api/generation-error-logs.ts` (Astro file-based routing).
- **Parametry zapytania (wszystkie opcjonalne):**
  - `page` — numer strony (liczba całkowita ≥ 1). Domyślnie: 1.
  - `limit` — liczba wpisów na stronę (liczba całkowita, np. 1–100). Domyślnie: 20.
  - `sort` — pole i kierunek sortowania. Dopuszczalne wartości: `created_at`, `created_at_desc`, `model`, `model_desc`, `error_code`, `error_code_desc`. Domyślnie: `created_at_desc`.
  - Opcjonalne filtry: `model` (string), `created_after` (ISO 8601 datetime), `created_before` (ISO 8601 datetime).
- **Request Body:** brak (GET).

## 3. Wykorzystywane typy

Wszystkie typy odwołują się do `src/types.ts` oraz `src/db/database.types.ts`.

- **GenerationErrorLog** (`src/types.ts`) — alias wiersza tabeli `generation_error_logs`: `Database["public"]["Tables"]["generation_error_logs"]["Row"]`. Zawiera: `id`, `user_id`, `model`, `source_text_hash`, `source_text_length`, `error_code`, `error_message`, `created_at`, oraz opcjonalnie `generation_id` (jeśli występuje w schemacie DB).
- **GenerationErrorLogDto** (`src/types.ts`) — już zdefiniowany: `Pick<GenerationErrorLog, "id" | "error_code" | "error_message" | "model" | "source_text_hash" | "source_text_length" | "created_at" | "user_id">`. Reprezentuje pojedynczy wpis w odpowiedzi API.
- **PaginationDto** (`src/types.ts`) — `{ page, limit, total }`. Używany w odpowiedzi listy (spójnie z GET `/generations` i GET `/flashcards`).
- **GenerationErrorLogsListResponseDto** (do dodania w `src/types.ts`) — typ odpowiedzi 200: `{ data: GenerationErrorLogDto[]; pagination: PaginationDto }`.

Brak nowych Command Modeli — endpoint tylko odczytuje dane; nie przyjmuje body do tworzenia ani aktualizacji.

## 4. Szczegóły odpowiedzi

- **Sukces (200 OK):** body w formacie:

```json
{
  "data": [
    {
      "id": 1,
      "user_id": "uuid",
      "model": "openrouter/default",
      "source_text_hash": "abc123",
      "source_text_length": 2500,
      "error_code": "AI_TIMEOUT",
      "error_message": "Request timed out",
      "created_at": "2026-01-30T12:00:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 42 }
}
```

- **Nagłówki:** `Content-Type: application/json`.
- **Kody błędów:** 400 (nieprawidłowe parametry zapytania), 401 (brak lub nieprawidłowy token), 403 (dostęp tylko dla administratorów), 500 (błąd serwera) — szczegóły w sekcji 6.

## 5. Przepływ danych

1. **Żądanie:** Klient wysyła GET na `/api/generation-error-logs` z opcjonalnymi parametrami zapytania (`page`, `limit`, `sort`, filtry).
2. **Middleware / kontekst:** Astro przekazuje żądanie do handlera w `src/pages/api/generation-error-logs.ts`. Klient Supabase i identyfikator użytkownika z `context.locals` (obecnie `DEFAULT_USER_ID` z `src/db/supabase.client.ts`, spójnie z innymi endpointami).
3. **Endpoint (GET handler):**
   - Odczyt parametrów zapytania z `request.url` (URL search params).
   - Walidacja Zod: parsowanie i walidacja `page`, `limit`, `sort`, opcjonalnych filtrów. Nieprawidłowe parametry → **400** z czytelnym komunikatem i `details`.
   - Sprawdzenie uwierzytelnienia: brak `userId` → **401**.
   - (Opcjonalnie) Sprawdzenie roli administratora: jeśli produkt wymaga, aby tylko admin mógł wywołać ten endpoint, użytkownik niebędący adminem → **403**.
   - Wywołanie serwisu: `listGenerationErrorLogs(supabase, userId, options)`.
4. **Serwis (nowy moduł lub rozszerzenie `generation.service.ts`):**
   - Zapytanie do Supabase: `from('generation_error_logs').select('*', { count: 'exact', head: false }).eq('user_id', userId)` + zastosowanie sortowania, zakresu (range) dla paginacji oraz opcjonalnych filtrów.
   - Filtr `user_id` zapewnia autoryzację (użytkownik widzi tylko swoje logi).
   - Mapowanie wierszy na **GenerationErrorLogDto** i zbudowanie **GenerationErrorLogsListResponseDto** (data + pagination).
5. **Handler:** Wynik sukcesu → **200** z JSON body; błąd serwisu (np. błąd Supabase) → **500** z ogólnym komunikatem.

Brak zapisu do tabeli `generation_error_logs` w tym endpoincie — tabela jest tylko odczytywana. Zapis do niej odbywa się w `generation.service.ts` (funkcja `logGenerationError`) przy błędach generacji AI.

## 6. Względy bezpieczeństwa

- **Uwierzytelnienie:** Wymagane. Brak zalogowanego użytkownika (brak lub nieprawidłowy JWT / brak `userId` w kontekście) → **401**. Użycie `context.locals` i spójnie `DEFAULT_USER_ID` w fazie rozwoju.
- **Autoryzacja:** Zapytanie do bazy zawsze z filtrem `.eq('user_id', userId)`. Zwracane są tylko wpisy należące do bieżącego użytkownika. Jeśli w przyszłości endpoint ma być dostępny wyłącznie dla administratorów, po weryfikacji tokena należy sprawdzić rolę użytkownika i zwrócić **403** dla nie-admina.
- **Walidacja wejścia:** Wszystkie parametry zapytania muszą być walidowane (Zod): `page`, `limit` w dopuszczalnych zakresach; `sort` z whitelisty; `created_after` / `created_before` w formacie ISO 8601. Zapobiega to błędom zapytań i nadużyciom (np. nadmierne `limit`).
- **Supabase:** Użycie `supabase` z `context.locals` zgodnie z regułami projektu; typ `SupabaseClient` z `src/db/supabase.client.ts`.
- **Nie ujawniać wewnętrznych szczegółów:** W odpowiedziach 500 nie zwracać stacków ani wewnętrznych komunikatów bazy; logować je po stronie serwera.

## 7. Obsługa błędów

| Scenariusz | Kod HTTP | Treść odpowiedzi (przykład) |
|------------|----------|------------------------------|
| Nieprawidłowe parametry zapytania (np. `page=0`, `limit=1000`, nieprawidłowy `sort` lub datetime) | 400 | `{ "error": "Bad Request", "message": "Invalid query parameters", "details": { "page": ["..."], ... } }` |
| Brak uwierzytelnienia / nieprawidłowy token | 401 | `{ "error": "Unauthorized", "message": "Authentication required" }` |
| Dostęp zarezerwowany dla administratorów (użytkownik nie jest adminem) | 403 | `{ "error": "Forbidden", "message": "Access restricted to administrators" }` |
| Błąd bazy danych lub serwera | 500 | `{ "error": "Internal Server Error", "message": "Failed to retrieve error logs" }` |

Walidację wykonywać na początku handlera (guard clauses): najpierw walidacja parametrów, potem sprawdzenie `userId`, ewentualnie roli, na końcu wywołanie serwisu i obsługa wyniku. W przypadku 500 zalecane jest logowanie błędu po stronie serwera (np. `console.error`), bez ujawniania wewnętrznych szczegółów w body odpowiedzi.

## 8. Rozważania dotyczące wydajności

- **Paginacja:** Obowiązkowe użycie `page` i `limit` (z rozsądnym maksymalnym `limit`, np. 100) oraz `range(from, to)` w zapytaniu Supabase, aby uniknąć zwracania nieograniczonej liczby wierszy.
- **Indeksy:** Zapytanie filtruje po `user_id` i sortuje po `created_at` (domyślnie). Zalecane indeksy: `generation_error_logs(user_id)`, `generation_error_logs(user_id, created_at DESC)` — w zależności od istniejącej schemy bazy.
- **Jeden zapytanie:** Jedno wywołanie `select` z `count: 'exact'` dla danych i łącznej liczby wierszy (spójnie z `listGenerations`), bez N+1.
- **Opcjonalne filtry:** Filtry `model`, `created_after`, `created_before` ograniczają wynik i mogą korzystać z indeksów; nie są wymagane dla minimalnej implementacji, ale poprawiają użyteczność bez znaczącego narzutu.

## 9. Etapy wdrożenia

1. **Dodanie typu odpowiedzi listy w `src/types.ts`**
   - Zdefiniować **GenerationErrorLogsListResponseDto**: `{ data: GenerationErrorLogDto[]; pagination: PaginationDto }`.
   - Upewnić się, że **GenerationErrorLogDto** obejmuje wszystkie pola potrzebne w odpowiedzi (obecna definicja: `id`, `error_code`, `error_message`, `model`, `source_text_hash`, `source_text_length`, `created_at`, `user_id`).

2. **Utworzenie lub rozszerzenie serwisu**
   - **Opcja A:** Dodać funkcję `listGenerationErrorLogs` w istniejącym `src/lib/services/generation.service.ts` (logika spokrewniona z generowaniem i istniejącym `logGenerationError`).
   - **Opcja B:** Utworzyć `src/lib/services/generation-error-log.service.ts` z funkcją `listGenerationErrorLogs(supabase, userId, options)`.
   - Serwis: przyjmuje `ListGenerationErrorLogsOptions` (page, limit, sort, opcjonalne filtry). Wykonuje zapytanie do `generation_error_logs` z `.eq('user_id', userId)`, stosuje sortowanie i `.range(from, to)`, zwraca `{ success: true, data: GenerationErrorLogsListResponseDto }` lub `{ success: false, errorMessage: string }`. Mapowanie wiersza DB na **GenerationErrorLogDto** (kolumny zgodne z Pick w types).

3. **Walidacja parametrów zapytania w API**
   - W pliku `src/pages/api/generation-error-logs.ts` zdefiniować schemat Zod dla query params (np. `generationErrorLogsListQuerySchema`): `page`, `limit`, `sort` (enum: `created_at`, `created_at_desc`, `model`, `model_desc`, `error_code`, `error_code_desc`), opcjonalnie `model`, `created_after`, `created_before` (ISO datetime). Stałe: DEFAULT_PAGE=1, DEFAULT_LIMIT=20, MAX_LIMIT=100.
   - Przy niepowodzeniu parsowania zwracać **400** z polem `details` (flatten field errors).

4. **Utworzenie pliku route API**
   - Dodać plik `src/pages/api/generation-error-logs.ts`.
   - Ustawić `export const prerender = false`.
   - W handlerze GET: odczytać URL search params, sparsować przez Zod, pobrać `userId` (np. `DEFAULT_USER_ID`), zwrócić **401**, gdy brak użytkownika. Opcjonalnie: sprawdzenie roli admin → **403** dla nie-admina.
   - Wywołać `listGenerationErrorLogs(supabase, userId, options)`; przy sukcesie zwrócić **200** z `result.data`; przy błędzie zwrócić **500** z ogólnym komunikatem i zalogować błąd.

5. **Mapowanie sortowania w serwisie**
   - Zdefiniować mapowanie wartości `sort` na kolumnę i kierunek (ascending/descending) dla tabeli `generation_error_logs` (np. `created_at`, `model`, `error_code`), analogicznie do `mapSortToOrder` w `generation.service.ts` dla `listGenerations`.

6. **Testy i weryfikacja**
   - Ręcznie lub w testach: żądanie bez tokena → 401; z tokenem/użytkownikiem → 200 z tablicą (pusta lub z danymi); nieprawidłowe query params → 400; ewentualnie użytkownik nie-admin gdy wymagana rola admin → 403.
   - Sprawdzenie, że zwracane pola odpowiadają **GenerationErrorLogDto** i że paginacja (`page`, `limit`, `total`) jest poprawna.

7. **Dokumentacja i ewentualna korekta specyfikacji**
   - Uzupełnić dokumentację API (np. `.ai/api-plan.md`) o opis parametrów zapytania GET `/generation-error-logs` (page, limit, sort, filtry) oraz przykład odpowiedzi 200 z paginacją, jeśli nie były wcześniej opisane.
   - Poprawić literówki w specyfikacji: „Retrieveserror” → „Retrieves error”, „Unathorized” → „Unauthorized”.

Plan zapewnia spójność z istniejącymi endpointami (GET `/generations`, GET `/flashcards`), stosuje reguły projektu (Supabase z `locals`, Zod, early returns, `json()` z `src/lib/api-response.ts`) oraz prawidłowe kody stanu HTTP (200, 400, 401, 403, 500).
