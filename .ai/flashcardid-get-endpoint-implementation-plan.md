# Plan wdrożenia endpointu API: GET /flashcards/{id}

## 1. Przegląd punktu końcowego

Endpoint **GET `/flashcards/{id}`** służy do pobrania szczegółów pojedynczej fiszki po jej identyfikatorze. Rekord musi należeć do zalogowanego użytkownika (izolacja danych per `user_id`). Endpoint jest tylko do odczytu; nie modyfikuje danych ani nie zapisuje do tabeli `generation_error_logs`. Wymaga uwierzytelnienia.

---

## 2. Szczegóły żądania

- **Metoda HTTP:** GET  
- **Struktura URL:** `/api/flashcards/[id]` — dynamiczny segment ścieżki (plik `src/pages/api/flashcards/[id].ts`; w tym samym pliku co PUT i DELETE).  
- **Parametry:**
  - **Wymagane (path):** `id` — identyfikator fiszki (BIGSERIAL). Musi być dodatnią liczbą całkowitą. Nieprawidłowy format (np. ujemna liczba, tekst, ułamek) → **400 Bad Request**.  
- **Opcjonalne:** brak (GET bez query string).  
- **Request Body:** brak (metoda GET).

---

## 3. Wykorzystywane typy

Wszystkie potrzebne typy są zdefiniowane w `src/types.ts`; nie ma potrzeby wprowadzania nowych DTO ani Command Modeli.

- **FlashcardDto** — reprezentacja pojedynczej fiszki w odpowiedzi API: `id`, `front`, `back`, `source` (lowercase: `manual` | `ai-full` | `ai-edited`), `generation_id`, `created_at`, `updated_at`. Używany jako body odpowiedzi 200 dla GET `/flashcards/{id}`.

Mapowanie wiersza z bazy na `FlashcardDto` (w tym konwersja `source` z wartości DB na lowercase) jest zaimplementowane w `flashcard.service.ts` (`rowToFlashcardDto`, `dbSourceToApi`). Należy korzystać z istniejącej funkcji serwisu `getFlashcardById`, która zwraca już `FlashcardDto` lub `null`.

---

## 4. Szczegóły odpowiedzi

### Sukces (200 OK)

- **Body:** pojedynczy obiekt `FlashcardDto`.  
- **Nagłówki:** `Content-Type: application/json`.

Przykład:

```json
{
  "id": 1,
  "front": "Question",
  "back": "Answer",
  "source": "manual",
  "created_at": "2026-01-30T12:00:00Z",
  "updated_at": "2026-01-30T12:00:00Z",
  "generation_id": null
}
```

### Kody błędów

- **400 Bad Request** — nieprawidłowy parametr `id` (np. nie liczba, ujemna, zero). Odpowiedź: `{ "error": "Bad Request", "message": "Invalid flashcard id", "details": { "id": ["..."] } }`.  
- **401 Unauthorized** — brak uwierzytelnienia (brak lub nieprawidłowy token / brak `userId` w kontekście). Odpowiedź: `{ "error": "Unauthorized", "message": "Authentication required" }`.  
- **404 Not Found** — fiszka o podanym `id` nie istnieje lub nie należy do zalogowanego użytkownika. Odpowiedź: `{ "error": "Not Found", "message": "Flashcard not found" }`.  
- **500 Internal Server Error** — błąd po stronie serwera (np. błąd bazy danych). Odpowiedź: `{ "error": "Internal Server Error", "message": "..." }`.

---

## 5. Przepływ danych

1. Klient wysyła GET na `/api/flashcards/{id}` (np. `/api/flashcards/1`).  
2. Middleware Astro (jeśli konfiguracja projektu to przewiduje) może ustawiać `locals.supabase` i ewentualnie `locals.userId`.  
3. Handler GET w `src/pages/api/flashcards/[id].ts`:  
   - Odczyt `params.id` z kontekstu.  
   - Walidacja Zod: `id` jako dodatnia liczba całkowita (np. istniejący schemat `flashcardIdParamSchema` z tego samego pliku, używany przez PUT/DELETE); błąd walidacji → **400**.  
   - Pobranie `userId` z `locals` (docelowo sesja) lub `DEFAULT_USER_ID` z `src/db/supabase.client.ts`; brak użytkownika → **401**.  
   - Pobranie klienta Supabase z `locals.supabase`.  
   - Wywołanie `getFlashcardById(supabase, userId, id)` z `src/lib/services/flashcard.service.ts`.  
4. Serwis `getFlashcardById`:  
   - Zapytanie do Supabase: `from('flashcards').select('*').eq('id', id).eq('user_id', userId).maybeSingle()`.  
   - Brak wiersza → zwrot `{ success: true, data: null }`.  
   - Znaleziony wiersz → mapowanie przez `rowToFlashcardDto` i zwrot `{ success: true, data: FlashcardDto }`.  
   - Błąd zapytania → `{ success: false, errorMessage: "..." }`.  
5. Handler:  
   - `result.success === false` → **500** z `result.errorMessage`.  
   - `result.data === null` → **404**.  
   - W przeciwnym razie → **200** z `result.data` (FlashcardDto).  
6. Odpowiedź zwracana przez helper `json(body, status)` z `src/lib/api-response.ts` (Content-Type: application/json).

---

## 6. Względy bezpieczeństwa

- **Uwierzytelnienie:** Endpoint wymaga zalogowanego użytkownika. Należy zawsze sprawdzać obecność `userId` przed wywołaniem serwisu; brak → **401**.  
- **Autoryzacja (izolacja danych):** Zapytanie w serwisie filtruje po `user_id`; użytkownik widzi tylko własne fiszki. Nie zwracamy informacji, czy rekord w ogóle istnieje dla innego użytkownika (404 bez rozróżnienia „nie istnieje” vs „należy do kogo innego”).  
- **Walidacja wejścia:** Parametr ścieżki `id` musi być walidowany przez Zod (dodatnia liczba całkowita), aby uniknąć nieprawidłowych zapytań i ewentualnych nadużyć (np. wstrzykiwanie wartości).  
- **Brak wrażliwych danych w odpowiedzi:** `FlashcardDto` nie zawiera `user_id` w odpowiedzi API (tylko `id`, `front`, `back`, `source`, `generation_id`, `created_at`, `updated_at`).  
- Endpoint nie zapisuje do `generation_error_logs` — ta tabela służy wyłącznie błędom związanym z generowaniem AI.

---

## 7. Obsługa błędów

| Scenariusz | Kod | Akcja handlera |
|------------|-----|----------------|
| Nieprawidłowy `id` (format, zero, ujemny) | 400 | Zwrócić błąd walidacji Zod z `details` (fieldErrors). |
| Brak uwierzytelnienia (`userId` brak) | 401 | Zwrócić `{ error: "Unauthorized", message: "Authentication required" }`. |
| Fiszka nie znaleziona lub należy do innego użytkownika | 404 | Zwrócić `{ error: "Not Found", message: "Flashcard not found" }`. |
| Błąd bazy danych / Supabase | 500 | Zalogować błąd (console.error), zwrócić ogólny komunikat użytkownika, nie ujawniać szczegółów technicznych. |

Spójność komunikatów i formatu błędów z pozostałymi endpointami (np. PUT/DELETE w `[id].ts`, GET/POST w `flashcards.ts`) ułatwia konsumpcję API po stronie klienta.

---

## 8. Rozważania dotyczące wydajności

- **Pojedyncze zapytanie:** Serwis wykonuje jedno zapytanie `select` z filtrem `id` + `user_id` oraz `.maybeSingle()`, co jest wydajne.  
- **Indeksy:** Tabela `flashcards` ma klucz główny `id` (BIGSERIAL); zapytanie z `eq('id', id)` wykorzystuje indeks PK. Filtrowanie po `user_id` może być wsparte indeksem na `user_id` (zalecane przy większym wolumenie).  
- **Brak N+1:** Endpoint zwraca jedną fiszkę; nie ma paginacji ani dodatkowych joinów.  
- **Caching:** W przyszłości można rozważyć krótkotrwałe cache’owanie odpowiedzi po `id` + `userId` (np. na poziomie CDN lub aplikacji), z uwzględnieniem unieważnienia przy PUT/DELETE.

---

## 9. Etapy wdrożenia

1. **Dodać obsługę GET w pliku route**  
   W `src/pages/api/flashcards/[id].ts` dodać eksport funkcji `GET: APIRoute`. Upewnić się, że plik ma `export const prerender = false`.

2. **Wykorzystać istniejący schemat walidacji parametru**  
   Użyć tego samego `flashcardIdParamSchema` (Zod), co w PUT i DELETE, do walidacji `params` (path param `id`). W przypadku `safeParse` failure zwrócić **400** z `details` (flatten().fieldErrors) oraz czytelnym `message` (np. "Invalid flashcard id").

3. **Sprawdzić uwierzytelnienie**  
   Pobrać `userId` z `locals` lub `DEFAULT_USER_ID` z `src/db/supabase.client.ts`. Jeśli brak — zwrócić **401** z `json({ error: "Unauthorized", message: "Authentication required" }, 401)`.

4. **Wywołać serwis**  
   Pobrać `supabase` z `context.locals`. Wywołać `getFlashcardById(supabase, userId, parsedParams.data.id)` z `src/lib/services/flashcard.service.ts`.

5. **Zmapować wynik na odpowiedź HTTP**  
   - `result.success === false` → **500** z `result.errorMessage`.  
   - `result.data === null` → **404** z komunikatem "Flashcard not found".  
   - W przeciwnym razie → **200** z `result.data` (już jako `FlashcardDto`).

6. **Użyć helpera `json`**  
   Wszystkie odpowiedzi zwracać przez `json(body, status)` z `src/lib/api-response.ts`, aby zachować spójny nagłówek `Content-Type: application/json`.

7. **Przetestować ręcznie lub w testach**  
   - GET z prawidłowym `id` (własna fiszka) → 200 i obiekt FlashcardDto.  
   - GET z prawidłowym formatem `id`, ale nieistniejąca lub cudza fiszka → 404.  
   - GET z nieprawidłowym `id` (np. 0, -1, "abc") → 400.  
   - GET bez uwierzytelnienia (gdy auth jest włączone) → 401.

8. **Uwzględnić linter**  
   Uruchomić linter na zmodyfikowanym pliku i poprawić ewentualne ostrzeżenia (np. nieużywane zmienne, typy).

Po realizacji powyższych kroków endpoint GET `/flashcards/{id}` będzie zgodny ze specyfikacją API, stosował się do zasad projektu (Astro Server Endpoints, Supabase z `locals`, Zod, serwis w `src/lib/services`, wczesne zwroty przy błędach) i pozostanie spójny z PUT/DELETE w tym samym pliku route.
