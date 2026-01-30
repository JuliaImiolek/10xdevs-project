# Plan wdrożenia endpointów API: GET /flashcards oraz GET /flashcards/{id}

## 1. Przegląd punktów końcowych

- **GET `/flashcards`** — zwraca paginowaną, opcjonalnie filtrowaną i sortowaną listę fiszek zalogowanego użytkownika. Odpowiedź zawiera tablicę `data` oraz metadane `pagination`. Wymaga uwierzytelnienia.

- **GET `/flashcards/{id}`** — zwraca pojedynczą fiszkę po identyfikatorze. Rekord musi należeć do zalogowanego użytkownika. Wymaga uwierzytelnienia.

Oba endpointy są tylko do odczytu; nie zapisują do tabeli `generation_error_logs` (ta tabela służy wyłącznie błędom związanym z generowaniem AI).

---

## 2. Szczegóły żądania

### GET /flashcards

- **Metoda HTTP:** GET  
- **Struktura URL:** `/api/flashcards` (plik `src/pages/api/flashcards.ts`; w tym samym pliku obsługa GET obok istniejącego POST).  
- **Parametry zapytania (wszystkie opcjonalne):**
  - `page` — numer strony (liczba całkowita ≥ 1). Domyślnie: 1.  
  - `limit` — liczba elementów na stronę (liczba całkowita, w rozsądnym zakresie, np. 1–100). Domyślnie: np. 20.  
  - `sort` — pole i kierunek sortowania. Dopuszczalne wartości: np. `created_at`, `created_at_desc`, `updated_at`, `updated_at_desc`, `source`, `source_desc` (tabela `flashcards` nie ma kolumny „category”; sort po `source` jest odpowiednikiem „kategorii” typu źródła). Domyślnie: np. `created_at_desc`.  
  - Opcjonalny filtr (jeśli specyfikacja „filtered” ma być spełniona): `source` — filtr po źródle fiszki (`manual`, `ai-full`, `ai-edited`).  
- **Request Body:** brak (GET).

### GET /flashcards/{id}

- **Metoda HTTP:** GET  
- **Struktura URL:** `/api/flashcards/[id]` — dynamiczny segment ścieżki (plik `src/pages/api/flashcards/[id].ts`).  
- **Parametry:**
  - **Wymagane (path):** `id` — identyfikator fiszki (BIGSERIAL). Musi być dodatnią liczbą całkowitą. Nieprawidłowy format → **400**.  
- **Request Body:** brak (GET).

---

## 3. Wykorzystywane typy

Wszystkie typy są zdefiniowane w `src/types.ts`; nie ma potrzeby wprowadzania nowych DTO.

- **FlashcardDto** — reprezentacja pojedynczej fiszki w odpowiedzi API: `id`, `front`, `back`, `source` (lowercase: `manual` | `ai-full` | `ai-edited`), `generation_id`, `created_at`, `updated_at`. Używany w tablicy `data` w GET `/flashcards` oraz w body GET `/flashcards/{id}`.  
- **PaginationDto** — `{ page, limit, total }`. Używany w GET `/flashcards`.  
- **FlashcardsListResponseDto** — `{ data: FlashcardDto[], pagination: PaginationDto }`. Typ odpowiedzi 200 dla GET `/flashcards`.  

Mapowanie wiersza z bazy na `FlashcardDto` (w tym konwersja `source` z wartości DB na lowercase) jest już zaimplementowane w `flashcard.service.ts` (`rowToFlashcardDto`, `dbSourceToApi`). Należy z niego korzystać w nowych funkcjach serwisu.

---

## 4. Szczegóły odpowiedzi

### GET /flashcards — sukces (200 OK)

- **Body:**  
  - `data`: tablica obiektów `FlashcardDto`.  
  - `pagination`: `{ page, limit, total }` — `total` to łączna liczba fiszek spełniających kryteria (przed paginacją).  
- **Nagłówki:** `Content-Type: application/json`.

Przykład:

```json
{
  "data": [
    {
      "id": 1,
      "front": "Question",
      "back": "Answer",
      "source": "manual",
      "created_at": "2026-01-30T12:00:00Z",
      "updated_at": "2026-01-30T12:00:00Z",
      "generation_id": null
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 100 }
}
```

### GET /flashcards/{id} — sukces (200 OK)

- **Body:** pojedynczy obiekt `FlashcardDto`.  
- **Nagłówki:** `Content-Type: application/json`.

Kody błędów dla obu endpointów — patrz sekcja 6.

---

## 5. Przepływ danych

### GET /flashcards

1. Klient wysyła GET na `/api/flashcards` z opcjonalnymi parametrami `page`, `limit`, `sort`, ewentualnie `source` (filtr).  
2. Handler w `src/pages/api/flashcards.ts`:  
   - Odczyt parametrów z `request.url` (URLSearchParams).  
   - Walidacja Zod: schemat dla `page`, `limit`, `sort`, opcjonalnie `source`; nieprawidłowe wartości → **400**.  
   - Pobranie `userId` z `locals` (docelowo sesja) lub `DEFAULT_USER_ID`; brak użytkownika → **401**.  
   - Mapowanie sparowanych parametrów na opcje serwisu (np. `ListFlashcardsOptions`: `page`, `limit`, `sort`, `filter?: { source? }`).  
   - Wywołanie `listFlashcards(supabase, userId, options)` z `src/lib/services/flashcard.service.ts`.  
3. Serwis:  
   - Zapytanie do Supabase: `from('flashcards').select('*', { count: 'exact', head: false }).eq('user_id', userId)`.  
   - Zastosowanie opcjonalnego filtra `source` (mapowanie wartości API na wartość w DB, np. MANUAL / AI-FULL / AI-EDITED).  
   - Sortowanie według `sort` (mapowanie wartości `sort` na kolumnę i kierunek).  
   - Paginacja: `.range((page - 1) * limit, page * limit - 1)`.  
   - Mapowanie wierszy przez `rowToFlashcardDto` na `FlashcardDto[]`.  
   - Zwrot `{ data, pagination: { page, limit, total } }`.  
4. Handler: wynik sukcesu → **200** z JSON; błąd serwisu → **500**.

### GET /flashcards/{id}

1. Klient wysyła GET na `/api/flashcards/{id}`.  
2. Handler w `src/pages/api/flashcards/[id].ts`:  
   - Odczyt `params.id`.  
   - Walidacja Zod: `id` jako dodatnia liczba całkowita; błąd → **400**.  
   - Sprawdzenie `userId` (jak wyżej); brak → **401**.  
   - Wywołanie `getFlashcardById(supabase, userId, id)`.  
3. Serwis:  
   - Zapytanie: `from('flashcards').select('*').eq('id', id).eq('user_id', userId).maybeSingle()`.  
   - Brak wiersza → zwrot `{ success: true, data: null }`.  
   - Znaleziony wiersz → mapowanie przez `rowToFlashcardDto` i zwrot `{ success: true, data: FlashcardDto }`.  
   - Błąd DB → `{ success: false, errorMessage }`.  
4. Handler: `data === null` → **404**; sukces → **200** z `FlashcardDto`; błąd serwisu → **500**.

---

## 6. Względy bezpieczeństwa

- **Uwierzytelnienie:** Wymagane dla obu endpointów. Brak `userId` → **401**. Supabase z `context.locals`; do czasu pełnej integracji auth — `DEFAULT_USER_ID` z `src/db/supabase.client.ts`.  
- **Autoryzacja:** Wszystkie zapytania z filtrem `.eq('user_id', userId)`. Użytkownik widzi wyłącznie swoje fiszki. Dla GET `/{id}`: brak rekordu lub inny `user_id` → **404** (bez ujawniania, czy rekord w ogóle istnieje).  
- **Walidacja wejścia:**  
  - GET `/flashcards`: parametry zapytania walidowane Zod (page, limit, sort, opcjonalnie source); ograniczenie zakresu `limit` (np. max 100) zapobiega przeciążeniu.  
  - GET `/flashcards/{id}`: `id` tylko jako dodatnia liczba całkowita (Zod).  
- **Supabase:** Użycie klienta z `context.locals`; typ `SupabaseClient` z `src/db/supabase.client.ts`.

---

## 7. Obsługa błędów

| Scenariusz | Kod HTTP | Przykład treści odpowiedzi |
|------------|----------|----------------------------|
| GET `/flashcards`: nieprawidłowe parametry zapytania (page, limit, sort, source) | 400 | `{ "error": "Bad Request", "message": "Invalid query parameters", "details": { "limit": ["Limit must be at most 100"] } }` |
| GET `/flashcards/{id}`: nieprawidłowy format `id` (np. `abc`, `0`, `-1`) | 400 | `{ "error": "Bad Request", "message": "Invalid flashcard id", "details": { ... } }` |
| Brak uwierzytelnienia (brak userId) | 401 | `{ "error": "Unauthorized", "message": "Authentication required" }` |
| GET `/flashcards/{id}`: fiszka nie istnieje lub nie należy do użytkownika | 404 | `{ "error": "Not Found", "message": "Flashcard not found" }` |
| Błąd bazy danych / serwera | 500 | `{ "error": "Internal Server Error", "message": "Failed to list flashcards" }` lub `"Failed to fetch flashcard"` |

Tabela `generation_error_logs` nie jest używana przez te endpointy (tylko odczyt fiszek).

---

## 8. Wydajność

- **Paginacja:** Obowiązkowe użycie `limit` z górnym ograniczeniem (np. 100). Domyślny rozsądny `limit` (np. 20) zmniejsza rozmiar odpowiedzi.  
- **Zapytania:** Jedno zapytanie z `count: 'exact'` dla listy (Supabase zwraca `count` w jednym wywołaniu). Dla GET `/{id}` — jedno `select` z `.maybeSingle()`.  
- **Indeksy:** Zalecane indeksy w DB: `flashcards(user_id)`, `flashcards(user_id, created_at)` (lub używane kolumny sortowania) w zależności od polityki projektu.  
- **Mapowanie:** Reużycie `rowToFlashcardDto` w serwisie — brak duplikacji logiki mapowania.

---

## 9. Kroki implementacji

1. **Rozszerzenie `flashcard.service.ts`**  
   - Dodać typy: `ListFlashcardsOptions` (page, limit, sort, filter?: { source? }), `ListFlashcardsResult`, `GetFlashcardByIdResult`.  
   - Zdefiniować dopuszczalne wartości `sort` (np. `created_at`, `created_at_desc`, `updated_at`, `updated_at_desc`, `source`, `source_desc`).  
   - Zaimplementować funkcję mapującą `sort` na kolumnę i kierunek (analogicznie do `mapSortToOrder` w generation.service).  
   - Zaimplementować `listFlashcards(supabase, userId, options)`: filtr `user_id`, opcjonalny filtr `source` (mapowanie API → DB), sort, `.range()`, `count: 'exact'`, mapowanie wierszy przez `rowToFlashcardDto`, zwrot `{ data, pagination }`.  
   - Zaimplementować `getFlashcardById(supabase, userId, id)`: `select('*').eq('id', id).eq('user_id', userId).maybeSingle()`, mapowanie przez `rowToFlashcardDto`, zwrot `{ success, data }` lub `{ success: false, errorMessage }`.

2. **Walidacja zapytań GET /flashcards**  
   - W `src/pages/api/flashcards.ts` dodać schemat Zod dla parametrów zapytania (page, limit, sort, opcjonalnie source) — domyślne wartości i ograniczenia jak w sekcji 2.  
   - Dodać funkcję mapującą sparowane parametry na `ListFlashcardsOptions`.

3. **Handler GET w `src/pages/api/flashcards.ts`**  
   - W tym samym pliku co POST: eksport `GET: APIRoute`.  
   - Odczyt URL, parsowanie parametrów, walidacja schematem; błąd → **400**.  
   - Pobranie `userId`; brak → **401**.  
   - Wywołanie `listFlashcards(supabase, userId, options)`; sukces → **200** z `FlashcardsListResponseDto`; błąd → **500** z ustalonym komunikatem.  
   - Użycie `json()` z `src/lib/api-response.ts`.

4. **Utworzenie pliku `src/pages/api/flashcards/[id].ts`**  
   - `export const prerender = false`.  
   - Schemat Zod dla `params.id`: `z.coerce.number().int().positive()`.  
   - Handler GET: walidacja `id`; brak userId → **401**; `getFlashcardById(supabase, userId, id)`; `data === null` → **404**; sukces → **200** z `FlashcardDto`; błąd serwisu → **500**.  
   - Użycie `json()` z `src/lib/api-response.ts`.

5. **Spójność z projektem**  
   - Upewnić się, że w odpowiedziach błędów używane są te same klucze (`error`, `message`, opcjonalnie `details`) co w GET `/generations` i GET `/generations/[id]`.  
   - Usunąć ewentualną lokalną definicję `json` z `flashcards.ts` na rzecz importu z `src/lib/api-response.ts` (jeśli jeszcze tam jest), aby jedna była wspólna dla POST i GET.

6. **Testy (opcjonalnie)**  
   - Testy jednostkowe lub ręczne: GET `/flashcards` z różnymi `page`, `limit`, `sort`, `source`; GET `/flashcards/{id}` z poprawnym id, nieistniejącym id, niepoprawnym formatem; brak auth → 401.

Po realizacji powyższych kroków endpointy GET `/flashcards` i GET `/flashcards/{id}` będą zgodne ze specyfikacją, stosem technologicznym (Astro, Supabase, Zod, TypeScript) oraz regułami implementacji (logika w serwisie, walidacja Zod, wczesne zwroty błędów, spójne kody stanu 200/400/401/404/500).
