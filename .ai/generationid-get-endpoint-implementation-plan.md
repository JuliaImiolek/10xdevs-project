# API Endpoint Implementation Plan: GET /generations/{id}

## 1. Przegląd punktu końcowego

Endpoint **GET `/generations/{id}`** służy do pobrania pojedynczego rekordu generacji (z tabeli `generations`) po jego identyfikatorze. Zwraca obiekt JSON reprezentujący ten rekord. Endpoint wymaga uwierzytelnienia; zwraca dane tylko wtedy, gdy rekord istnieje **i** należy do zalogowanego użytkownika (autoryzacja po `user_id`). Zwraca **200 OK** z danymi rekordu, **404**, gdy rekord nie istnieje lub nie należy do użytkownika, **401** przy braku autoryzacji, **400** przy nieprawidłowym formacie `id` oraz **500** przy błędach serwera.

## 2. Szczegóły żądania

- **Metoda HTTP:** GET
- **Struktura URL:** `/api/generations/[id]` — dynamiczny segment ścieżki (plik `src/pages/api/generations/[id].ts` w Astro).
- **Parametry:**
  - **Wymagane (path):** `id` — identyfikator generacji (BIGSERIAL w tabeli `generations`). Musi być poprawną liczbą całkowitą dodatnią (np. `1`, `42`). Nieprawidłowy format (np. `abc`, `0`, `-1`, ułamek) → **400**.
  - **Opcjonalne:** brak (specyfikacja API nie definiuje parametrów zapytania dla tego endpointu).
- **Request Body:** brak (GET).

## 3. Wykorzystywane typy

- **Generation** (`src/types.ts`) — alias wiersza tabeli `generations` z `Database["public"]["Tables"]["generations"]["Row"]`. Zawiera: `id`, `user_id`, `model`, `generated_count`, `accepted_unedited_count`, `accepted_edited_count`, `source_text_hash`, `source_text_length`, `generation_duration`, `created_at`, `updated_at`.
- **GenerationDetailDto** (`src/types.ts`) — już zdefiniowany: `Generation & { flashcards?: FlashcardDto[] }`. Dla minimalnej implementacji zgodnej ze specyfikacją („JSON object representing the generation record”) odpowiedź to po prostu rekord generacji; pole `flashcards` pozostaje opcjonalne i może być pominięte w pierwszej wersji lub dodane później (np. przy opcjonalnym parametrze `include_flashcards`). W odpowiedzi używa się obiektu zgodnego z **Generation** lub **GenerationListItemDto** (te same pola co wiersz).
- **GenerationListItemDto** (`src/types.ts`) — `Pick<Generation, "id" | "user_id" | "model" | ...>` — spójny z listą GET `/generations`; można zwracać ten sam kształt dla pojedynczego rekordu, aby API było spójne. Zalecane: zwracać **GenerationListItemDto** (lub pełny **Generation**, jeśli nie ma potrzeby ukrywania pól) jako body odpowiedzi 200.

Żadnych nowych DTO nie trzeba dodawać do `src/types.ts` — wystarczą istniejące **Generation**, **GenerationListItemDto** i ewentualnie **GenerationDetailDto**, jeśli w przyszłości dodamy opcjonalne `flashcards`.

## 4. Szczegóły odpowiedzi

- **Sukces (200 OK):** body w formacie obiektu reprezentującego rekord generacji, np.:

```json
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
```

- **Nagłówki:** `Content-Type: application/json`.
- **Kody błędów:** 400 (nieprawidłowy `id`), 401 (brak uwierzytelnienia), 404 (rekord nie znaleziony lub brak dostępu), 500 (błąd serwera) — szczegóły w sekcji 6.

## 5. Przepływ danych

1. **Żądanie:** Klient wysyła GET na `/api/generations/{id}` (np. `/api/generations/1`).
2. **Middleware / kontekst:** Astro przekazuje żądanie do handlera w `src/pages/api/generations/[id].ts`. Klient Supabase i (docelowo) użytkownik pochodzą z `context.locals` (np. `locals.supabase`, `locals.userId`); do czasu pełnej integracji auth — identyfikator użytkownika z `DEFAULT_USER_ID` z `src/db/supabase.client.ts`, spójnie z GET `/api/generations` i POST `/api/generations`.
3. **Endpoint (GET handler):**
   - Odczyt segmentu ścieżki `id` z `context.params.id`.
   - Walidacja Zod: `id` jako dodatnia liczba całkowita (string z URL → number, np. `z.coerce.number().int().positive()`). Nieprawidłowy format → **400** z czytelnym komunikatem.
   - Sprawdzenie uwierzytelnienia: brak `userId` → **401**.
   - Wywołanie serwisu: `getGenerationById(supabase, userId, id)`.
4. **Serwis (`src/lib/services/generation.service.ts`):**
   - Zapytanie do Supabase: `from('generations').select('*').eq('id', id).eq('user_id', userId).maybeSingle()`.
   - Filtr `user_id` zapewnia autoryzację (użytkownik widzi tylko swoje generacje); brak wiersza lub wiersz należący do innego użytkownika → serwis zwraca `null`.
   - Mapowanie wiersza na **GenerationListItemDto** (lub zwrot wiersza jako **Generation**) i zwrócenie do handlera.
5. **Handler:**
   - Wynik `null` → **404** („Generation not found” lub „Resource not found”).
   - Wynik z danymi → **200** z JSON body (rekordu generacji).

Brak zapisu do tabeli `generation_error_logs` — ta tabela służy do logowania błędów związanych z generowaniem (AI / tworzenie generacji), a nie do odczytu pojedynczego rekordu.

## 6. Względy bezpieczeństwa

- **Uwierzytelnienie:** Wymagane. Brak zalogowanego użytkownika → **401**. Użycie `context.locals` (docelowo sesja Supabase) i spójnie `DEFAULT_USER_ID` w fazie rozwoju.
- **Autoryzacja:** Zapytanie do bazy zawsze z filtrem `.eq('user_id', userId)`. Zwracany jest tylko rekord należący do bieżącego użytkownika. W przypadku braku rekordu lub braku dostępu zwracany jest **404**, aby nie ujawniać istnienia obcych rekordów (unikanie enumeracji po ID).
- **Walidacja wejścia:** Parametr `id` ze ścieżki URL musi być walidowany (Zod): dopuszczalne tylko dodatnie liczby całkowite. Zapobiega to błędom typu „invalid input syntax” i ogranicza ryzyko nadużyć (np. wstrzykiwanie wartości).
- **Supabase:** Użycie `supabase` z `context.locals` zgodnie z regułami projektu; typ `SupabaseClient` z `src/db/supabase.client.ts`.

## 7. Obsługa błędów

| Scenariusz | Kod HTTP | Treść odpowiedzi (przykład) |
|------------|----------|------------------------------|
| Nieprawidłowy format `id` (np. `abc`, `0`, `-1`) | 400 | `{ "error": "Bad Request", "message": "Invalid generation id", "details": { "id": ["..."] } }` |
| Brak uwierzytelnienia | 401 | `{ "error": "Unauthorized", "message": "Authentication required" }` |
| Rekord nie istnieje lub nie należy do użytkownika | 404 | `{ "error": "Not Found", "message": "Generation not found" }` |
| Błąd bazy danych / serwera | 500 | `{ "error": "Internal Server Error", "message": "Failed to fetch generation" }` |

Walidację wykonywać na początku handlera (guard clauses); najpierw walidacja `id`, potem sprawdzenie `userId`, na końcu wywołanie serwisu i obsługa wyniku. W przypadku 500 zalecane jest logowanie błędu po stronie serwera (np. `console.error` lub logger), bez ujawniania wewnętrznych szczegółów w body odpowiedzi.

## 8. Rozważania dotyczące wydajności

- **Pojedyncze zapytanie:** Jedno zapytanie `select('*').eq('id', id).eq('user_id', userId).maybeSingle()` — indeks na `generations(id)` (PK) i filtrowanie po `user_id`; dla jednego rekordu wydajność jest przewidywalna.
- **Brak paginacji:** Endpoint zwraca jeden rekord — paginacja nie dotyczy.
- **Opcjonalne rozszerzenie:** Jeśli w przyszłości zostanie dodane pole `flashcards` (np. **GenerationDetailDto** z `include_flashcards`), warto rozważyć jedno zapytanie z joinem do `flashcards` zamiast N+1, lub osobny endpoint dla fiszek danej generacji.

## 9. Etapy wdrożenia

1. **Walidacja parametru `id` w API**
   - W pliku `src/pages/api/generations/[id].ts` zdefiniować schemat Zod dla `id` (np. `z.coerce.number().int().positive()` lub parsowanie `params.id` jako string i transformacja do number z walidacją). Przy niepowodzeniu parsowania zwracać **400** z komunikatem typu „Invalid generation id”.

2. **Utworzenie pliku route API**
   - Dodać plik `src/pages/api/generations/[id].ts` (dynamiczny segment Astro).
   - Ustawić `export const prerender = false`.
   - W handlerze GET odczytać `context.params.id`, zweryfikować go przez Zod, pobrać `userId` (np. `DEFAULT_USER_ID` z `src/db/supabase.client.ts`) i zwrócić **401**, gdy brak użytkownika.

3. **Funkcja serwisu `getGenerationById`**
   - W `src/lib/services/generation.service.ts` dodać funkcję `getGenerationById(supabase, userId, id): Promise<GenerationListItemDto | null>`.
   - Wykonać zapytanie: `from('generations').select('*').eq('id', id).eq('user_id', userId).maybeSingle()`.
   - W przypadku błędu zapytania (np. `error` z Supabase) zalogować błąd i zwrócić `null` (lub rozróżnić „not found” od „db error” — wtedy caller może zwrócić 404 lub 500). Zalecenie: przy `error` zwracać wynik typu `{ success: false, errorMessage }`, a przy braku wiersza `{ success: true, data: null }`; w handlerze: `data === null` → 404, `success === false` → 500.
   - Przy znalezionym wierszu zwrócić obiekt zgodny z **GenerationListItemDto** (wiersz już ma odpowiedni kształt).

4. **Integracja handlera z serwisem**
   - W GET handlerze wywołać `getGenerationById(locals.supabase, userId, parsedId)`.
   - Gdy wynik to „not found” (brak rekordu lub brak dostępu) → odpowiedź **404** z jednolitym komunikatem (np. „Generation not found”).
   - Gdy wystąpi błąd serwera (np. `success === false`) → odpowiedź **500** z ogólnym komunikatem.
   - Gdy sukces — odpowiedź **200** z body w formacie JSON (rekordu generacji).

5. **Spójność odpowiedzi i typów**
   - Użyć wspólnej helpera do odpowiedzi JSON (np. `json(body, status)` jak w `src/pages/api/generations.ts`) z nagłówkiem `Content-Type: application/json`.
   - Upewnić się, że zwracany obiekt jest typu **GenerationListItemDto** lub **Generation** (bez dodatkowych pól wrażliwych).

6. **Testy manualne / automatyczne**
   - Przetestować: poprawne `id` (200), nieistniejące `id` (404), `id` należące do innego użytkownika (404), nieprawidłowe `id` (400), brak auth (401), ewentualnie błąd DB (500).

7. **Linter i jakość kodu**
   - Uruchomić linter na zmodyfikowanych plikach; poprawić ewentualne błędy i zachować spójność z regułami projektu (early returns, guard clauses, brak niepotrzebnych `else`).
