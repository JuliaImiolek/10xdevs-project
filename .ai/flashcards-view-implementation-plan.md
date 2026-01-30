# Plan implementacji widoku Moje fiszki (Flashcards)

## 1. Przegląd

Widok **Moje fiszki** (`/flashcards`) umożliwia zalogowanemu użytkownikowi przeglądanie zapisanych fiszek, wyszukiwanie i filtrowanie ich, przeglądanie z podziałem na strony (paginacja) oraz edycję i usuwanie fiszek z poziomu interfejsu. Operacje edycji odbywają się w modalu z walidacją limitów znaków; usunięcie wymaga potwierdzenia. Widok realizuje wymagania US-003 i US-006 z PRD oraz spełnia założenia dostępności (m.in. obsługa klawiatury, potwierdzenia operacji).

## 2. Routing widoku

- **Ścieżka**: `/flashcards`
- **Plik strony**: `src/pages/flashcards.astro`
- Widok jest chroniony: dostęp tylko dla zalogowanych użytkowników (middleware przekierowuje niezalogowanych np. na `/login`).

## 3. Struktura komponentów

```
flashcards.astro (strona Astro)
└── Layout
    └── FlashcardsView (React, client:load)
        ├── Toolbar (wyszukiwanie, filtr źródła, sortowanie)
        ├── FlashcardsList
        │   ├── FlashcardListCard[] (dla każdej fiszki z data)
        │   └── Pagination
        ├── EditFlashcardModal (warunkowy)
        └── DeleteConfirmDialog (warunkowy)
```

- **FlashcardsView**: kontener widoku; zarządza stanem listy, paginacją, wyszukiwaniem/filtrami, otwartym modalem edycji i dialogiem usunięcia; wywołuje API (GET lista, PUT, DELETE).
- **Toolbar**: pole wyszukiwania, select filtra źródła (wszystkie / manual / ai-full / ai-edited), select sortowania.
- **FlashcardsList**: renderuje listę kart fiszek oraz komponent paginacji.
- **FlashcardListCard**: pojedyncza karta fiszki (przód, tył, etykieta źródła); przyciski „Edycja” i „Usuń”.
- **Pagination**: informacja „Strona X z Y”, przyciski Poprzednia / Następna (oraz opcjonalnie numery stron).
- **EditFlashcardModal**: modal z formularzem edycji (przód, tył, źródło); walidacja i wysłanie PUT.
- **DeleteConfirmDialog**: dialog „Czy na pewno usunąć?” z przyciskami Anuluj / Usuń.

## 4. Szczegóły komponentów

### FlashcardsView

- **Opis**: Główny komponent widoku. Pobiera listę fiszek (GET), utrzymuje stan paginacji, sortowania, filtra źródła i opcjonalnie zapytania wyszukiwania; otwiera modal edycji lub dialog usunięcia dla wybranej fiszki; po edycji (PUT) lub usunięciu (DELETE) odświeża listę lub aktualizuje stan lokalny.
- **Główne elementy**: `<main>`, wewnątrz Toolbar, FlashcardsList, EditFlashcardModal, DeleteConfirmDialog; ewentualnie komunikat błędu lub stan pusty / ładowania.
- **Obsługiwane zdarzenia**: zmiana strony (pagination), zmiana sortowania/filtra/wyszukiwania, „Edycja” na karcie (otwarcie modalu), „Usuń” na karcie (otwarcie dialogu), zapisz edycję (PUT), anuluj edycję, potwierdź usunięcie (DELETE), anuluj usunięcie.
- **Walidacja**: Nie wykonuje walidacji pól bezpośrednio; przekazuje do modalu wymagania (przód 1–200 znaków, tył 1–500 znaków, źródło ai-edited | manual). Przed wywołaniem PUT upewnia się, że payload jest zgodny z API.
- **Typy**: `FlashcardDto`, `PaginationDto`, `FlashcardsListResponseDto` (odpowiedź GET); dla PUT body – typ zgodny z API (np. `FlashcardPutPayload`: `front?`, `back?`, `source?`).
- **Propsy**: Brak (komponent główny widoku).

### Toolbar

- **Opis**: Pasek z wyszukiwaniem, filtrem źródła i sortowaniem; wartości przekazywane do rodzica (callbacki), aby FlashcardsView mógł ustawiać parametry zapytania lub filtrować dane.
- **Główne elementy**: `<div>` lub `<header>`, `<input>` lub `<SearchInput>` (wyszukiwanie), `<select>` lub komponent Shadcn dla filtra źródła i sortowania.
- **Obsługiwane zdarzenia**: `onSearchChange`, `onSourceFilterChange`, `onSortChange` (wartości zgodne z API: sort np. `created_at_desc`, source: `manual` | `ai-full` | `ai-edited` lub „wszystkie”).
- **Walidacja**: Brak walidacji wejścia; opcjonalnie ograniczenie długości wpisu wyszukiwania (np. max 200 znaków), aby uniknąć nadmiernie długich zapytań.
- **Typy**: `ListFlashcardsSort` (lub string union), typ filtra źródła (string | undefined).
- **Propsy**: `searchQuery: string`, `onSearchChange: (q: string) => void`, `sourceFilter: string | undefined`, `onSourceFilterChange: (s: string | undefined) => void`, `sort: string`, `onSortChange: (s: string) => void`, `disabled?: boolean` (np. podczas ładowania).

### FlashcardsList

- **Opis**: Wyświetla tablicę fiszek w postaci kart oraz komponent paginacji; obsługuje stany: ładowanie, brak wyników, błąd (przekazane z rodzica).
- **Główne elementy**: `<section>`, lista `<FlashcardListCard>` (map po `data`), komponent `Pagination`; opcjonalnie skeleton lub komunikat „Brak fiszek” / „Wystąpił błąd”.
- **Obsługiwane zdarzenia**: `onEdit(flashcard: FlashcardDto)`, `onDelete(flashcard: FlashcardDto)` – przekazywane do każdej karty.
- **Walidacja**: Brak.
- **Typy**: `FlashcardDto[]`, `PaginationDto`.
- **Propsy**: `flashcards: FlashcardDto[]`, `pagination: PaginationDto`, `loading: boolean`, `error: string | null`, `onEdit: (f: FlashcardDto) => void`, `onDelete: (f: FlashcardDto) => void`, `onPageChange: (page: number) => void`.

### FlashcardListCard

- **Opis**: Jedna karta na liście: wyświetla „przód” i „tył” fiszki, etykietę źródła (manual / ai-full / ai-edited) oraz przyciski „Edycja” i „Usuń”. Dostępność klawiaturowa (focus, Enter/Space na przyciskach).
- **Główne elementy**: `Card` (Shadcn), `CardHeader`/`CardContent` z tekstem przód/tył, badge źródła, `Button` Edycja, `Button` Usuń.
- **Obsługiwane zdarzenia**: `onEdit`, `onDelete` (wywołane z danymi tej fiszki).
- **Walidacja**: Brak.
- **Typy**: `FlashcardDto`.
- **Propsy**: `flashcard: FlashcardDto`, `onEdit: (f: FlashcardDto) => void`, `onDelete: (f: FlashcardDto) => void`.

### Pagination

- **Opis**: Wyświetla aktualną stronę i całkowitą liczbę stron; przyciski „Poprzednia” / „Następna” (oraz opcjonalnie numery stron). Wywołuje `onPageChange` z numerem strony.
- **Główne elementy**: `<nav>`, przyciski, ewentualnie numery stron; aria-label dla dostępności.
- **Obsługiwane zdarzenia**: `onPageChange(page: number)`.
- **Walidacja**: Nie przechodzi na stronę &lt; 1 ani &gt; maxPage (obliczone z `pagination.total`, `pagination.limit`).
- **Typy**: `PaginationDto`.
- **Propsy**: `pagination: PaginationDto`, `onPageChange: (page: number) => void`, `disabled?: boolean`.

### EditFlashcardModal

- **Opis**: Modal z formularzem edycji fiszki: pola „Przód” (input) i „Tył” (textarea), select „Źródło” (ai-edited | manual). Walidacja przed wysłaniem: przód niepusty, max 200 znaków; tył niepusty, max 500 znaków; źródło wymagane. Wysyła PUT `/api/flashcards/{id}`; przy sukcesie zamyka modal i powiadamia rodzica (odświeżenie listy).
- **Główne elementy**: Dialog/Modal (Shadcn), formularz, Input, Textarea, Select, przyciski „Anuluj” i „Zapisz”; komunikaty błędów walidacji przy polach.
- **Obsługiwane zdarzenia**: `onSubmit` (payload: front, back, source), `onCancel` (zamknięcie bez zapisu).
- **Walidacja**:  
  - **Przód**: wymagane, 1–200 znaków (po trim).  
  - **Tył**: wymagane, 1–500 znaków (po trim).  
  - **Źródło**: wymagane, jedna z wartości: `ai-edited`, `manual` (zgodnie z PUT API).  
  Błędy wyświetlane inline przy polach; przy 400 z API – mapowanie `details` na błędy pól.
- **Typy**: `FlashcardDto` (do inicjalizacji formularza), payload PUT: `{ front: string; back: string; source: "ai-edited" | "manual" }`.
- **Propsy**: `flashcard: FlashcardDto | null` (null = zamknięty), `onClose: () => void`, `onSaved: (updated: FlashcardDto) => void`, `onError: (message: string) => void`.

### DeleteConfirmDialog

- **Opis**: Dialog potwierdzenia usunięcia fiszki. Tekst np. „Czy na pewno chcesz usunąć tę fiszkę?”; przyciski „Anuluj” i „Usuń”. Po potwierdzeniu wywołuje DELETE `/api/flashcards/{id}` i przy sukcesie zamyka dialog oraz powiadamia rodzica (np. refetch lub usunięcie z listy).
- **Główne elementy**: AlertDialog (Shadcn), tytuł, opis, przyciski Anuluj / Usuń.
- **Obsługiwane zdarzenia**: `onConfirm` (wywołanie DELETE po stronie rodzica lub przekazanie id do rodzica), `onCancel`.
- **Walidacja**: Brak.
- **Typy**: `FlashcardDto` (do wyświetlenia etykiety lub id).
- **Propsy**: `flashcard: FlashcardDto | null` (null = zamknięty), `onClose: () => void`, `onConfirm: (id: number) => void`, `loading?: boolean`.

## 5. Typy

### Istniejące (src/types.ts) – użycie bez zmian

- **FlashcardDto**: `id`, `front`, `back`, `source`, `generation_id`, `created_at`, `updated_at` – element listy i dane do modalu edycji.
- **PaginationDto**: `page`, `limit`, `total` – metadane paginacji z GET `/api/flashcards`.
- **FlashcardsListResponseDto**: `{ data: FlashcardDto[]; pagination: PaginationDto }` – odpowiedź GET.

### Typy dopasowane do API widoku

- **FlashcardPutPayload** (body PUT `/api/flashcards/{id}`):  
  `{ front?: string; back?: string; source?: "ai-edited" | "manual" }`  
  Wymagane: co najmniej jedno pole. Walidacja po stronie API: front 1–200, back 1–500, source tylko `ai-edited` lub `manual`. W formularzu modalu wysyłane są zawsze wszystkie trzy pola (po walidacji).

- **EditFlashcardFormState** (stan formularza w EditFlashcardModal):  
  `{ front: string; back: string; source: "ai-edited" | "manual" }`  
  Opcjonalnie: `errors: { front?: string; back?: string; source?: string }` dla komunikatów walidacji.

- **FlashcardsListQuery** (parametry GET listy):  
  Odpowiednik `FlashcardsListQuery` z `src/pages/api/flashcards.ts`: `page`, `limit`, `sort`, `source?`. Sort: `created_at` | `created_at_desc` | `updated_at` | `updated_at_desc` | `source` | `source_desc`.  
  Można zaimportować typ z API lub zduplikować w `types.ts` jako `FlashcardsListQueryParams` (page, limit, sort, source?).

Widok nie wprowadza nowych encji w `types.ts` poza ewentualnym aliasem `FlashcardPutPayload` jeśli backend nie eksportuje typu body PUT (obecnie w `[id].ts` jest `FlashcardPutRequestBody` – można go wyeksportować i użyć w frontendzie).

## 6. Zarządzanie stanem

- **Stan w FlashcardsView** (lub w jednym hooku `useFlashcardsView`):  
  - `data: FlashcardDto[]`, `pagination: PaginationDto` – z GET;  
  - `loading: boolean`, `error: string | null`;  
  - `page`, `limit`, `sort`, `sourceFilter` – parametry zapytania;  
  - `searchQuery: string` – jeśli wyszukiwanie jest po stronie klienta (filtrowanie `data`);  
  - `editingFlashcard: FlashcardDto | null` – otwarty modal edycji;  
  - `deletingFlashcard: FlashcardDto | null` – otwarty dialog usunięcia.

- **Custom hook `useFlashcardsList`** (rekomendowany):  
  - Wejście: `page`, `limit`, `sort`, `sourceFilter` (opcjonalnie `searchQuery` jeśli API będzie wspierać parametr wyszukiwania).  
  - Wyjście: `{ data, pagination, loading, error, refetch }`.  
  - Wewnętrznie: wywołanie GET `/api/flashcards` z query params; przy zmianie parametrów – ponowne pobranie.  
  - Można rozszerzyć o `setPage`, `setSort`, `setSourceFilter` i wykonywanie refetch w tym samym hooku.

- **Aktualizacja po edycji/usunięciu**:  
  - **Opcja A**: po udanym PUT/DELETE wywołać `refetch()` z hooka listy (najprostsze, spójne z serwerem).  
  - **Opcja B**: po PUT – podmiana elementu w `data` na zwrócony obiekt; po DELETE – usunięcie elementu z `data` (mniej requestów, ale trzeba uważać na spójność z paginacją).

Rekomendacja: użycie `useFlashcardsList` z `refetch` po każdej udanej mutacji.

## 7. Integracja API

### GET `/api/flashcards` – lista fiszek

- **Query**: `page` (number, domyślnie 1), `limit` (number, domyślnie 20, max 100), `sort` (string: `created_at` | `created_at_desc` | `updated_at` | `updated_at_desc` | `source` | `source_desc`), `source` (opcjonalnie: `manual` | `ai-full` | `ai-edited`).
- **Odpowiedź 200**: `{ data: FlashcardDto[]; pagination: { page, limit, total } }` – typ `FlashcardsListResponseDto`.
- **Błędy**: 400 (nieprawidłowe parametry), 401 (brak autentykacji), 500 (błąd serwera).  
- Frontend: buduje URL z `URLSearchParams`; przy 200 zapisuje `data` i `pagination`; przy 401 przekierowuje na login lub pokazuje komunikat; przy 400/500 ustawia `error` i ewentualnie toast.

### PUT `/api/flashcards/{id}` – aktualizacja fiszki

- **Body**: JSON `FlashcardPutPayload` – co najmniej jedno z: `front`, `back`, `source`; `source` tylko `ai-edited` | `manual`. Walidacja API: front 1–200 znaków, back 1–500 znaków.
- **Odpowiedź 200**: JSON – zaktualizowany `FlashcardDto`.
- **Błędy**: 400 (walidacja), 401, 404 (fiszka nie istnieje), 500.  
- Frontend: w modalu po walidacji wysyła PUT; przy 200 wywołuje `onSaved(updated)` i zamyka modal, następnie refetch listy; przy 400 mapuje `details` na błędy pól w formularzu; przy 404 toast „Fiszka nie została znaleziona” i zamknięcie modalu.

### DELETE `/api/flashcards/{id}` – usunięcie fiszki

- **Odpowiedź 200**: `{ message: "Flashcard deleted" }`.
- **Błędy**: 401, 404, 500.  
- Frontend: po potwierdzeniu w dialogu wysyła DELETE; przy 200 zamyka dialog i refetch listy; przy 404 toast „Fiszka nie została znaleziona”; przy 500 toast z komunikatem błędu.

Autentykacja: requesty z credentials (cookies/session) zgodnie z konfiguracją Astro (locals); nie trzeba dodawać nagłówków w kodzie widoku, o ile middleware ustawia sesję.

## 8. Interakcje użytkownika

| Akcja użytkownika | Reakcja interfejsu |
|-------------------|---------------------|
| Wejście na `/flashcards` | Pobranie pierwszej strony listy (GET), wyświetlenie kart lub stanu pustego/ładowania/błędu. |
| Zmiana strony (Pagination) | Ustawienie `page`, ponowne GET z nowym `page`; wyświetlenie nowej listy. |
| Zmiana sortowania | Ustawienie `sort`, GET z nowym `sort`; lista odświeżona. |
| Zmiana filtra źródła | Ustawienie `sourceFilter`, GET z parametrem `source`; lista odświeżona. |
| Wpisanie w wyszukiwarkę | Obecna implementacja API nie zwraca parametru wyszukiwania – opcja 1: filtrowanie po stronie klienta na załadowanej stronie (np. po `front`/`back`); opcja 2: rozszerzenie API o parametr `q`/`search` i wywołanie GET z tym parametrem. W planie zaleca się docelowo parametr wyszukiwania w API; do tego czasu – filtrowanie klienta na bieżącej stronie. |
| Klik „Edycja” na karcie | Otwarcie EditFlashcardModal z danymi tej fiszki; formularz wypełniony. |
| W modalu: zmiana pól i „Zapisz” | Walidacja (przód 1–200, tył 1–500, źródło); przy błędach – komunikaty przy polach; przy OK – PUT, zamknięcie modalu, refetch listy, ewentualnie toast „Zapisano”. |
| W modalu: „Anuluj” | Zamknięcie modalu bez zapisu. |
| Klik „Usuń” na karcie | Otwarcie DeleteConfirmDialog z tą fiszką. |
| W dialogu: „Usuń” | DELETE; przy sukcesie zamknięcie dialogu, refetch listy, toast „Fiszka usunięta”. |
| W dialogu: „Anuluj” | Zamknięcie dialogu bez usuwania. |

Dostępność: przyciski i pola formularza dostępne z klawiatury; dialog/modal z focus trap i zamknięciem Escape; aria-label dla paginacji i przycisków.

## 9. Warunki i walidacja

- **Lista (GET)**  
  - Parametry: `page` ≥ 1, `limit` 1–100, `sort` z zdefiniowanego zestawu, `source` opcjonalnie z zestawu (manual, ai-full, ai-edited).  
  - Weryfikacja: przed wysłaniem requestu wartości z Toolbar/state są mapowane na poprawne query params (np. limit z selectu lub stała 20). Błędy 400 zwracane przez API wyświetlane jako komunikat lub toast.

- **Edycja (PUT) – w EditFlashcardModal**  
  - **Przód**: niepusty (po trim), długość 1–200 znaków.  
  - **Tył**: niepusty (po trim), długość 1–500 znaków.  
  - **Źródło**: wymagane, wartość `ai-edited` lub `manual`.  
  - Walidacja wykonywana przy „Zapisz”; w przypadku błędów – ustawienie `errors` w stanie formularza i wyświetlenie pod polami. Przy odpowiedzi 400 z API – mapowanie `details` na te same pola.

- **Usunięcie (DELETE)**  
  - Jedyna weryfikacja po stronie UI: użytkownik musi potwierdzić w dialogu. Id wysyłane w URL jest liczbą dodatnią (już z `FlashcardDto.id`).

Wpływ na stan: błędy walidacji modalu nie zmieniają listy; błąd sieciowy/500 przy GET ustawia `error` i pokazuje komunikat; 401 przy dowolnym wywołaniu – przekierowanie lub komunikat „Zaloguj się”.

## 10. Obsługa błędów

- **401 Unauthorized**: Przekierowanie na `/login` (jeśli middleware nie zrobi tego automatycznie) lub komunikat „Sesja wygasła. Zaloguj się ponownie.” i link do logowania.
- **404** (PUT lub DELETE): Toast „Fiszka nie została znaleziona.”; zamknięcie modalu/dialogu; opcjonalnie refetch listy.
- **400** (GET – złe parametry): Toast lub komunikat „Nieprawidłowe parametry listy.”; nie zmieniać listy na pustą bez informacji.
- **400** (PUT – walidacja): Odpowiedź z `details` (fieldErrors) – mapować na błędy pól w EditFlashcardModal i wyświetlić przy polach; nie zamykać modalu.
- **500** lub błąd sieciowy: Toast „Wystąpił błąd. Spróbuj ponownie.”; przy GET ustawić `error` w stanie; przy PUT/DELETE zamknąć modal/dialog i ewentualnie refetch.
- **Pusta lista**: Gdy `data.length === 0` i nie ma błędu – komunikat „Brak fiszek” z linkiem np. do tworzenia/generowania fiszek.
- **Ładowanie**: Pokazać skeleton lub spinner w miejscu listy; przyciski paginacji/edycji/usunięcia można wyłączyć (`disabled`) podczas ładowania/mutacji.

## 11. Kroki implementacji

1. **Strona Astro**  
   Utworzyć `src/pages/flashcards.astro`: import Layout i komponentu `FlashcardsView`; w `<Layout>` umieścić `<main>` z `FlashcardsView` (client:load). Upewnić się, że ścieżka `/flashcards` jest chroniona przez middleware (przekierowanie niezalogowanych).

2. **Typy i API**  
   W `src/types.ts` dodać (jeśli brak w API) typ body PUT, np. `FlashcardPutPayload` (`front?`, `back?`, `source?` z wartościami ai-edited | manual). Zdefiniować lub zaimportować typ parametrów listy (page, limit, sort, source). Utworzyć funkcje lub hook wywołujące GET `/api/flashcards`, PUT `/api/flashcards/:id`, DELETE `/api/flashcards/:id` (np. w `src/lib/flashcards-api.ts` lub bezpośrednio w hooku z `fetch`).

3. **Hook useFlashcardsList**  
   W `src/components/hooks/useFlashcardsList.ts`: przyjmuje `page`, `limit`, `sort`, `sourceFilter`; wywołuje GET z query params; zwraca `{ data, pagination, loading, error, refetch, setPage, setSort, setSourceFilter }`. Obsługa 401/500 i ustawianie `error`.

4. **Komponent FlashcardsView**  
   W katalogu `src/components/flashcards/` (lub `src/components/list/`) utworzyć `FlashcardsView.tsx`: używa `useFlashcardsList`; stan lokalny: `editingFlashcard`, `deletingFlashcard`; renderuje Toolbar, FlashcardsList, EditFlashcardModal, DeleteConfirmDialog; obsługuje `onEdit`/`onDelete` (ustawianie wybranej fiszki), `onSaved`/refetch po PUT, refetch i zamknięcie dialogu po DELETE. Opcjonalnie: stan `searchQuery` i filtrowanie `data` po stronie klienta przed przekazaniem do listy (do momentu dodania wyszukiwania w API).

5. **Toolbar**  
   Komponent z polem wyszukiwania (kontrolowanym), selectem filtra źródła (wszystkie / manual / ai-full / ai-edited) i selectem sortowania (wartości z API). Callbacki: `onSearchChange`, `onSourceFilterChange`, `onSortChange`. Przekazać aktualne wartości i `disabled` gdy `loading`.

6. **FlashcardsList**  
   Przyjmuje `flashcards`, `pagination`, `loading`, `error`, `onEdit`, `onDelete`, `onPageChange`. Gdy `loading` – skeleton lub spinner; gdy `error` – komunikat; gdy `flashcards.length === 0` i !loading – „Brak fiszek”; w przeciwnym razie mapowanie `flashcards` na `FlashcardListCard` i renderowanie Pagination.

7. **FlashcardListCard**  
   Karta (Card Shadcn) z wyświetleniem `front`, `back`, badge `source`; przyciski „Edycja” i „Usuń” wywołujące `onEdit(flashcard)` i `onDelete(flashcard)`. Długie teksty można obcinać z „…” (CSS lub substring) z opcjonalnym tooltipem.

8. **Pagination**  
   Na podstawie `pagination.page`, `pagination.limit`, `pagination.total` obliczyć liczbę stron; przyciski „Poprzednia” / „Następna” (disabled na pierwszej/ostatniej stronie); `onPageChange(page)`. Opcjonalnie numery stron dla małej liczby stron.

9. **EditFlashcardModal**  
   Dialog (Shadcn) z formularzem: Input (przód), Textarea (tył), Select (źródło: ai-edited, manual). Inicjalizacja z `flashcard` przy otwarciu. Walidacja przed submitem (1–200, 1–500, wymagane źródło); wyświetlanie błędów przy polach. Submit: PUT `/api/flashcards/{id}` z body `{ front, back, source }`; przy 200 – `onSaved(response)`, zamknięcie; przy 400 – ustawienie błędów z `details`. Przycisk „Anuluj” zamyka bez zapisu.

10. **DeleteConfirmDialog**  
    AlertDialog z tytułem i krótkim opisem; przycisk „Usuń” wywołuje `onConfirm(flashcard.id)` (rodzic wykonuje DELETE); „Anuluj” – `onClose`. Opcjonalnie `loading` podczas DELETE (wyłączenie przycisku).

11. **Nawigacja i dostępność**  
    Dodać link „Moje fiszki” w menu nawigacji (Layout) do `/flashcards`. Sprawdzić focus trap w modalu i dialogu, zamknięcie na Escape, aria-label dla przycisków i paginacji.

12. **Testy i edge case’y**  
    Przetestować: pusta lista, jedna strona, wiele stron, zmiana sortowania/filtra, edycja i zapis (w tym błędy walidacji), usunięcie (w tym 404), 401 (wylogowanie). Upewnić się, że po edycji/usunięciu lista się odświeża (refetch) i modal/dialog się zamykają.

Po realizacji powyższych kroków widok Moje fiszki będzie zgodny z PRD (US-003, US-006), opisem w ui-plan oraz z istniejącymi endpointami GET/PUT/DELETE i typami w projekcie.
