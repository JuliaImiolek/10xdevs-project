# Plan wdrożenia endpointów API: PUT /flashcards/{id} oraz DELETE /flashcards/{id}

## 1. Przegląd punktów końcowych

- **PUT `/flashcards/{id}`** — aktualizuje istniejącą fiszkę o podanym identyfikatorze. Treść żądania (JSON) może zawierać pola `front`, `back` oraz `source`. Pole `source` przy aktualizacji może przyjmować wyłącznie wartości `ai-edited` lub `manual`. Wymaga uwierzytelnienia; użytkownik może aktualizować tylko swoje fiszki.

- **DELETE `/flashcards/{id}`** — usuwa fiszkę o podanym identyfikatorze. Wymaga uwierzytelnienia; użytkownik może usuwać tylko swoje fiszki. Zwraca kod 200 z komunikatem potwierdzającym usunięcie lub 204 No Content (zgodnie ze specyfikacją).

Oba endpointy operują na pojedynczym zasobie identyfikowanym przez `id` w ścieżce. Nie zapisują do tabeli `generation_error_logs` (ta tabela służy wyłącznie błędom związanym z generowaniem AI).

---

## 2. Szczegóły żądania

### PUT /flashcards/{id}

- **Metoda HTTP:** PUT  
- **Struktura URL:** `/api/flashcards/[id]` — dynamiczny segment ścieżki (plik `src/pages/api/flashcards/[id].ts`).  
- **Parametry:**
  - **Wymagane (path):** `id` — identyfikator fiszki (BIGSERIAL). Musi być dodatnią liczbą całkowitą. Nieprawidłowy format → **400**.  
- **Request Body:** JSON z polami do aktualizacji (co najmniej jedno pole wymagane):
  - `front` (opcjonalne): string, długość 1–200 znaków.
  - `back` (opcjonalne): string, długość 1–500 znaków.
  - `source` (opcjonalne): enum `"ai-edited"` | `"manual"` (dla PUT niedozwolone jest `ai-full`).  
- Pusta treść lub brak wszystkich dozwolonych pól po walidacji → **400**.

### DELETE /flashcards/{id}

- **Metoda HTTP:** DELETE  
- **Struktura URL:** `/api/flashcards/[id]` — ten sam plik co PUT.  
- **Parametry:**
  - **Wymagane (path):** `id` — identyfikator fiszki (BIGSERIAL). Dodatnia liczba całkowita. Nieprawidłowy format → **400**.  
- **Request Body:** brak (DELETE).

---

## 3. Wykorzystywane typy

- **FlashcardDto** (`src/types.ts`) — reprezentacja zaktualizowanej fiszki w odpowiedzi PUT: `id`, `front`, `back`, `source` (lowercase), `generation_id`, `created_at`, `updated_at`. Używany w body odpowiedzi 200 dla PUT.  
- **FlashcardUpdateDto** (`src/types.ts`) — typ częściowej aktualizacji (`front?`, `back?`, `source?`, `generation_id?`). W API PUT pole `source` jest ograniczone do `"ai-edited"` | `"manual"`; walidacja Zod w handlerze musi to wymusić (np. osobny schemat `flashcardPutBodySchema` z `z.enum(["ai-edited", "manual"])`).  
- Dla DELETE — odpowiedź: obiekt z polem `message` (np. `{ "message": "Flashcard deleted" }`) przy 200 lub puste body przy 204.

Nowe DTO nie są wymagane w `src/types.ts`; wystarczy typ wywnioskowany ze schematu Zod dla body PUT (np. `FlashcardPutRequestBody`) oraz spójna struktura odpowiedzi błędu/komunikatu.

---

## 4. Szczegóły odpowiedzi

### PUT /flashcards/{id} — sukces (200 OK)

- **Body:** pojedynczy obiekt `FlashcardDto` (zaktualizowana fiszka).  
- **Nagłówki:** `Content-Type: application/json`.

Przykład:

```json
{
  "id": 1,
  "front": "Updated question",
  "back": "Updated answer",
  "source": "ai-edited",
  "generation_id": 42,
  "created_at": "2026-01-30T12:00:00Z",
  "updated_at": "2026-01-30T12:05:00Z"
}
```

### DELETE /flashcards/{id} — sukces (200 OK lub 204 No Content)

- **200 OK:** body np. `{ "message": "Flashcard deleted" }`, `Content-Type: application/json`.  
- **204 No Content:** brak body (rekomendowane dla DELETE przy braku dodatkowych informacji).  
W planie przyjmuje się **200 OK** z komunikatem, aby zachować spójność z opisem „JSON message confirming deletion” ze specyfikacji.

Kody błędów — patrz sekcja 6.

---

## 5. Przepływ danych

### PUT /flashcards/{id}

1. Klient wysyła PUT na `/api/flashcards/{id}` z body JSON.  
2. Handler w `src/pages/api/flashcards/[id].ts`:  
   - Walidacja `params.id` (Zod: dodatnia liczba całkowita); błąd → **400**.  
   - Parsowanie body (JSON); niepoprawny JSON → **400**.  
   - Walidacja body schematem Zod: opcjonalne `front` (1–200 znaków), `back` (1–500 znaków), `source` (`ai-edited` | `manual`); co najmniej jedno pole musi być obecne; błąd → **400**.  
   - Pobranie `userId` (locals / DEFAULT_USER_ID); brak → **401**.  
   - Wywołanie `updateFlashcard(supabase, userId, id, payload)` z `flashcard.service.ts`.  
3. Serwis:  
   - Zapytanie: `from('flashcards').update(payload).eq('id', id).eq('user_id', userId).select().single()`.  
   - Payload: tylko przekazane pola; mapowanie `source` z API (lowercase) na wartość w DB (MANUAL, AI-EDITED) przez istniejące mapowanie w serwisie. Nie aktualizować `user_id`, `id`, `created_at`.  
   - Brak wiersza (PGRST116 lub brak danych) → zwrot „not found” → handler zwraca **404**.  
   - Błąd DB → zwrot `{ success: false, errorMessage }` → handler **500**.  
   - Sukces → mapowanie wiersza przez `rowToFlashcardDto` → zwrot `FlashcardDto` → handler **200**.  
4. Handler: wynik sukcesu → **200** z `FlashcardDto`; not found → **404**; błąd serwisu → **500**.

### DELETE /flashcards/{id}

1. Klient wysyła DELETE na `/api/flashcards/{id}`.  
2. Handler w `src/pages/api/flashcards/[id].ts`:  
   - Walidacja `params.id` (Zod: dodatnia liczba całkowita); błąd → **400**.  
   - Pobranie `userId`; brak → **401**.  
   - Wywołanie `deleteFlashcard(supabase, userId, id)`.  
3. Serwis:  
   - Zapytanie: `from('flashcards').delete().eq('id', id).eq('user_id', userId)`.  
   - Sprawdzenie, czy usunięto dokładnie jeden wiersz (np. `.select('id')` przed usunięciem lub użycie zwracanego stanu). W Supabase: `delete().eq(...).select()` zwraca usunięte wiersze; brak wiersza → fiszka nie istnieje lub nie należy do użytkownika → **404**.  
   - Sukces (usunięto 1 wiersz) → zwrot success → handler **200** (z komunikatem) lub **204**.  
   - Błąd DB → **500**.  
4. Handler: not found → **404**; sukces → **200** z `{ "message": "Flashcard deleted" }` (lub **204** bez body).

---

## 6. Względy bezpieczeństwa

- **Uwierzytelnienie:** Wymagane dla PUT i DELETE. Brak `userId` → **401**. Supabase z `context.locals`; do czasu pełnej integracji auth — `DEFAULT_USER_ID`.  
- **Autoryzacja:** Wszystkie operacje z filtrem `.eq('user_id', userId)`. Użytkownik może aktualizować i usuwać wyłącznie swoje fiszki. Brak rekordu lub inny `user_id` → **404** (bez ujawniania, czy rekord w ogóle istnieje).  
- **Walidacja wejścia:**  
  - PUT: body walidowane Zod; długości `front` (max 200), `back` (max 500); `source` tylko `ai-edited` | `manual` (uniemożliwienie ustawienia `ai-full` przez aktualizację). Nie zezwalać na przekazanie `user_id`, `id` ani `created_at` w body.  
  - PUT/DELETE: `id` w ścieżce — tylko dodatnia liczba całkowita (ochrona przed injection i nieprawidłowymi wartościami).  
- **Supabase:** Klient z `context.locals`; typ `SupabaseClient` z `src/db/supabase.client.ts`.

---

## 7. Obsługa błędów

| Scenariusz | Kod HTTP | Przykład treści odpowiedzi |
|------------|----------|----------------------------|
| Nieprawidłowy format `id` (np. `abc`, `0`, `-1`) | 400 | `{ "error": "Bad Request", "message": "Invalid flashcard id", "details": { ... } }` |
| PUT: niepoprawny JSON w body | 400 | `{ "error": "Bad Request", "message": "Invalid JSON body" }` |
| PUT: błąd walidacji body (puste pola, za długie stringi, niedozwolone `source`) | 400 | `{ "error": "Validation Error", "message": "...", "details": { "front": ["front must be at most 200 characters"] } }` |
| PUT: brak wszystkich dozwolonych pól w body | 400 | `{ "error": "Validation Error", "message": "At least one of front, back, or source is required" }` |
| Brak uwierzytelnienia (brak userId) | 401 | `{ "error": "Unauthorized", "message": "Authentication required" }` |
| Fiszka nie istnieje lub nie należy do użytkownika | 404 | `{ "error": "Not Found", "message": "Flashcard not found" }` |
| Błąd bazy danych / serwera | 500 | `{ "error": "Internal Server Error", "message": "Failed to update flashcard" }` / `"Failed to delete flashcard"` |

Tabela `generation_error_logs` nie jest używana przez te endpointy.

---

## 8. Wydajność

- **PUT:** Jedno zapytanie `update(...).eq(id).eq(user_id).select().single()` — brak dodatkowego SELECT przed update (Supabase zwraca zaktualizowany wiersz w jednym wywołaniu).  
- **DELETE:** Jedno zapytanie `delete().eq(id).eq(user_id)`; ewentualnie `.select('id')` aby odróżnić 404 od 200 (brak zwróconych wierszy = nie znaleziono).  
- **Indeksy:** Istniejące indeksy na `flashcards(id)` oraz `flashcards(user_id)` (lub złożone) zapewniają szybkie wyszukiwanie po `id` i `user_id`.  
- **Mapowanie:** Reużycie `rowToFlashcardDto` i mapowania `SOURCE_TO_DB` w serwisie — brak duplikacji logiki.

---

## 9. Kroki implementacji

1. **Rozszerzenie `src/lib/services/flashcard.service.ts`**  
   - Dodać typy: `UpdateFlashcardPayload` (np. `{ front?: string; back?: string; source?: "ai-edited" | "manual" }`), `UpdateFlashcardResult` = `{ success: true; data: FlashcardDto }` | `{ success: true; data: null }` (not found) | `{ success: false; errorMessage: string }`; `DeleteFlashcardResult` = `{ success: true }` | `{ success: true; notFound: true }` | `{ success: false; errorMessage: string }` (lub prosty wariant z jednym „not found” w success).  
   - Zaimplementować `updateFlashcard(supabase, userId, id, payload)`: zbudować obiekt update tylko z przekazanych pól; mapować `source` przez `SOURCE_TO_DB` (tylko MANUAL, AI-EDITED); wywołać `.update(...).eq('id', id).eq('user_id', userId).select().single()`; przy braku danych (error PGRST116 lub null) zwrócić `{ success: true, data: null }`; przy błędzie DB — `{ success: false, errorMessage }`; przy sukcesie — `{ success: true, data: rowToFlashcardDto(row) }`.  
   - Zaimplementować `deleteFlashcard(supabase, userId, id)`: np. `.delete().eq('id', id).eq('user_id', userId).select('id')`; jeśli zwrócona tablica ma długość 0 → `{ success: true, notFound: true }`; jeśli 1 → `{ success: true }`; błąd DB → `{ success: false, errorMessage }`.

2. **Utworzenie pliku `src/pages/api/flashcards/[id].ts`**  
   - `export const prerender = false`.  
   - Wspólny schemat Zod dla `params.id`: np. `z.object({ id: z.coerce.number().int().positive() })`; nieprawidłowy `id` → **400**.  
   - **PUT:** Odczyt body `await request.json()`, obsługa wyjątku przy niepoprawnym JSON → **400**. Schemat Zod dla body: `front` (optional, string, min 1, max 200), `back` (optional, string, min 1, max 500), `source` (optional, `z.enum(["ai-edited", "manual"])`). Refine: co najmniej jedno z pól `front`, `back`, `source` musi być obecne. Nie przekazywać do serwisu pól `user_id`, `id`, `created_at`.  
   - **DELETE:** Bez body; tylko walidacja `id` i `userId`.  
   - Pobieranie `userId` z locals (lub DEFAULT_USER_ID); brak → **401**.  
   - PUT: wywołanie `updateFlashcard(supabase, userId, id, parsedBody)`; `data === null` → **404**; sukces → **200** z `FlashcardDto`; błąd serwisu → **500**.  
   - DELETE: wywołanie `deleteFlashcard(supabase, userId, id)`; `notFound` → **404**; sukces → **200** z `{ "message": "Flashcard deleted" }`; błąd serwisu → **500**.  
   - Użycie `json()` z `src/lib/api-response.ts`.

3. **Spójność typów i walidacji**  
   - W `src/types.ts` typ `FlashcardUpdateDto` może pozostać z szerszym `source` (ai-full | ai-edited | manual); w API PUT jedynie schemat Zod w `[id].ts` ogranicza do `ai-edited` | `manual`. Ewentualnie dodać komentarz w types.ts, że dla PUT /flashcards/{id} dopuszczalne są tylko `ai-edited` i `manual`.  
   - Odpowiedzi błędów: te same klucze (`error`, `message`, opcjonalnie `details`) co w GET/POST `/flashcards` oraz w endpointach `/generations`.

4. **Testy (opcjonalnie)**  
   - Ręczne lub jednostkowe: PUT z poprawnym id i częściowym body (200); PUT z nieistniejącym id (404); PUT z nieprawidłowym body (400); PUT bez auth (401); DELETE z poprawnym id (200); DELETE z nieistniejącym id (404); DELETE z nieprawidłowym id (400); DELETE bez auth (401).

Po realizacji powyższych kroków endpointy PUT `/flashcards/{id}` i DELETE `/flashcards/{id}` będą zgodne ze specyfikacją API, stosem technologicznym (Astro, Supabase, Zod, TypeScript) oraz regułami implementacji (logika w serwisie, walidacja Zod, wczesne zwroty błędów, spójne kody stanu 200/400/401/404/500).
