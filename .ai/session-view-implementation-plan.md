# Plan implementacji widoku Sesja powtórek

## 1. Przegląd

Widok **Sesja powtórek** (`/session`) umożliwia zalogowanemu użytkownikowi przeprowadzenie sesji nauki z fiszkami: wyświetlanie przodu fiszki, odsłonięcie tyłu na żądanie oraz mechanizm oceny (np. Źle / Średnio / Dobrze) z intuicyjnym przechodzeniem do kolejnej fiszki. Interfejs jest minimalistyczny i skupiony na nauce, z czytelnymi przyciskami o wysokim kontraście oraz licznikiem postępu sesji. Zgodnie z PRD aplikacja ma integrować gotowy algorytm powtórek (biblioteka open-source); w pierwszej iteracji wdrożenia realizowany jest pełny przepływ UI (przód → odsłonięcie tyłu → ocena → następna fiszka), a zapis wyników sesji do algorytmu powtórek można dodać w kolejnej iteracji.

## 2. Routing widoku

- **Ścieżka**: `/session`
- **Plik strony**: `src/pages/session.astro`
- Widok jest chroniony: dostęp tylko dla zalogowanych użytkowników. Należy rozszerzyć middleware (`src/middleware/index.ts`) o ścieżkę `/session`, aby przekierować niezalogowanych np. na `/login` (analogicznie do `/flashcards`).

## 3. Struktura komponentów

```
session.astro (strona Astro)
└── Layout
    └── SessionView (React, client:load)
        ├── SessionProgress (licznik: „Fiszka X z Y”)
        ├── SessionCard (wyświetlanie przodu i opcjonalnie tyłu fiszki)
        ├── SessionControls („Pokaż odpowiedź”, przyciski oceny)
        └── SessionSummary (po zakończeniu sesji) lub stany: ładowanie / brak fiszek / błąd
```

- **SessionView**: kontener widoku; ładuje listę fiszek (GET `/api/flashcards`), zarządza indeksem bieżącej fiszki, stanem „odsłonięty tył”, zakończeniem sesji oraz wyświetlaniem podsumowania lub komunikatów (brak fiszek, błąd).
- **SessionProgress**: wyświetla postęp sesji (np. „Fiszka 3 z 12”).
- **SessionCard**: wyświetla treść jednej fiszki — przód zawsze widoczny, tył tylko gdy `revealed === true`.
- **SessionControls**: przycisk „Pokaż odpowiedź” (gdy tył ukryty) oraz po odsłonięciu — przyciski oceny (np. „Źle”, „Średnio”, „Dobrze”) do przejścia do kolejnej fiszki.
- **SessionSummary**: widoczny po zakończeniu sesji (wszystkie fiszki ocenione); komunikat typu „Sesja zakończona. Powtórzono X fiszek.” oraz przycisk „Rozpocznij ponownie” lub „Wróć do listy fiszek”.

## 4. Szczegóły komponentów

### SessionView

- **Opis**: Główny komponent widoku sesji. Przy montowaniu pobiera listę fiszek przez GET `/api/flashcards` (np. `page=1`, `limit=50`, `sort=created_at_desc`). Przechowuje stan: tablica fiszek, indeks bieżącej fiszki, czy tył jest odsłonięty, czy sesja jest zakończona. Renderuje SessionProgress, SessionCard, SessionControls lub — w zależności od stanu — SessionSummary, widok ładowania, komunikat „Brak fiszek” albo błąd (np. 401, 500).
- **Główne elementy**: `<main>`, wewnątrz warunkowo: SessionProgress, SessionCard, SessionControls, SessionSummary; lub skeleton / komunikat „Brak fiszek do powtórzenia” / komunikat błędu z ewentualnym przyciskiem „Spróbuj ponownie”.
- **Obsługiwane zdarzenia**: wewnętrznie: „Pokaż odpowiedź” (ustawienie `revealed = true`), wybór oceny (np. `onRate(grade)`) — zwiększenie indeksu, wyzerowanie `revealed`; gdy indeks >= liczba fiszek — ustawienie stanu „sesja zakończona”; „Rozpocznij ponownie” — reset indeksu i `revealed`, ewentualnie ponowne pobranie listy.
- **Walidacja**: Brak walidacji formularzy. Sprawdzenie: jeśli lista fiszek jest pusta po załadowaniu — wyświetlenie stanu „Brak fiszek”; indeks bieżącej fiszki nie wychodzi poza zakres tablicy.
- **Typy**: `FlashcardDto`, `FlashcardsListResponseDto` (odpowiedź GET); wewnętrzny stan: `FlashcardDto[]`, `number` (currentIndex), `boolean` (revealed), `boolean` (sessionEnded).
- **Propsy**: Brak (komponent główny widoku).

### SessionProgress

- **Opis**: Wyświetla licznik postępu sesji w formie „Fiszka X z Y” (X — pozycja bieżąca 1-based, Y — łączna liczba fiszek w sesji). Używany tylko gdy jest co najmniej jedna fiszka i sesja nie jest zakończona.
- **Główne elementy**: `<div>` lub `<p>` z tekstem, opcjonalnie `aria-live="polite"` dla czytników ekranu.
- **Obsługiwane zdarzenia**: Brak (komponent prezentacyjny).
- **Walidacja**: Brak. Wartości `currentIndex` i `total` przekazywane z rodzica; zalecane wyświetlać tylko gdy `total >= 1`.
- **Typy**: brak własnych DTO; używa liczb.
- **Propsy**: `currentIndex: number` (pozycja bieżąca, 1-based), `total: number` (liczba fiszek w sesji).

### SessionCard

- **Opis**: Komponent prezentacyjny wyświetlający jedną fiszkę: pole „przód” zawsze widoczne, pole „tył” widoczne tylko gdy `revealed === true`. Układ minimalistyczny, czytelny (np. karta Shadcn z wyraźną typografią). Responsywny i z wysokim kontrastem.
- **Główne elementy**: `Card` (Shadcn) lub ekwiwalent; blok z tekstem „przód”; blok z tekstem „tył” (warunkowo); unikanie obcięcia długich tekstów (np. przewijanie lub `max-height` z overflow).
- **Obsługiwane zdarzenia**: Brak (stan odsłonięcia sterowany przez rodzica).
- **Walidacja**: Brak. Treść z `FlashcardDto` (front, back) — API już zwraca poprawne dane.
- **Typy**: `FlashcardDto`.
- **Propsy**: `flashcard: FlashcardDto`, `revealed: boolean`.

### SessionControls

- **Opis**: Obsługa interakcji użytkownika: gdy tył nie jest odsłonięty — przycisk „Pokaż odpowiedź”; po odsłonięciu — przyciski oceny (np. „Źle”, „Średnio”, „Dobrze”) oraz opcjonalnie „Pomiń”. Przyciski o wysokim kontraście i czytelnych etykietach. Dostępność klawiaturowa: np. Enter/Space na przyciskach, opcjonalnie skróty 1/2/3 dla ocen.
- **Główne elementy**: `Button` (Shadcn) — „Pokaż odpowiedź”; po odsłonięciu: grupa przycisków oceny (np. trzy `Button`), ewentualnie „Pomiń”.
- **Obsługiwane zdarzenia**: `onReveal` (klik „Pokaż odpowiedź”), `onRate(grade: number)` (wybór oceny; np. 1 = Źle, 2 = Średnio, 3 = Dobrze), opcjonalnie `onSkip` (pomiń bez oceny).
- **Walidacja**: Brak. Wartość `grade` przekazywana do rodzica; rodzic decyduje o zakresie (np. 1–3).
- **Typy**: typ oceny — `number` (np. 1–3) lub union literałów; można zdefiniować `SessionGrade` w typach widoku.
- **Propsy**: `revealed: boolean`, `onReveal: () => void`, `onRate: (grade: number) => void`, `onSkip?: () => void`, `disabled?: boolean` (np. podczas ładowania).

### SessionSummary

- **Opis**: Wyświetlany po zakończeniu sesji (wszystkie fiszki zostały pokazane). Komunikat podsumowujący (np. „Sesja zakończona. Powtórzono X fiszek.”) oraz przycisk „Rozpocznij ponownie” (reset sesji na tej samej liście) i/lub „Wróć do listy fiszek” (nawigacja do `/flashcards`).
- **Główne elementy**: `<section>` lub `Card`, tytuł/komunikat, `Button` „Rozpocznij ponownie”, `Button` lub link „Wróć do listy fiszek”.
- **Obsługiwane zdarzenia**: `onRestart` (reset sesji w obrębie widoku), nawigacja do `/flashcards` (np. `<a>` lub `useNavigate`).
- **Walidacja**: Brak.
- **Typy**: brak nowych; liczba powtórzonych fiszek — `number`.
- **Propsy**: `totalReviewed: number`, `onRestart: () => void`.

## 5. Typy

### Istniejące (src/types.ts) — użycie bez zmian

- **FlashcardDto**: `id`, `front`, `back`, `source`, `generation_id`, `created_at`, `updated_at` — pojedyncza fiszka z API.
- **FlashcardsListResponseDto**: `{ data: FlashcardDto[]; pagination: PaginationDto }` — odpowiedź GET `/api/flashcards`.
- **PaginationDto**: `page`, `limit`, `total` — metadane paginacji (opcjonalnie do wyświetlenia rozmiaru zestawu).

### Nowe typy / modele widoku

- **SessionGrade**: wartość oceny w sesji. W pierwszej iteracji wystarczy `number` (np. 1 = Źle, 2 = Średnio, 3 = Dobrze). Dla rozszerzenia można zdefiniować:
  ```ts
  export type SessionGrade = 1 | 2 | 3; // lub union literałów
  ```
  Ewentualnie stałe: `SESSION_GRADE_AGAIN = 1`, `SESSION_GRADE_GOOD = 2`, `SESSION_GRADE_EASY = 3`.

- **SessionState** (ViewModel, opcjonalnie jako interfejs w pliku typów lub lokalnie w komponencie): stan widoku sesji:
  - `cards: FlashcardDto[]` — lista fiszek do powtórzenia w tej sesji;
  - `currentIndex: number` — indeks bieżącej fiszki (0-based);
  - `revealed: boolean` — czy tył bieżącej fiszki jest odsłonięty;
  - `sessionEnded: boolean` — czy wszystkie fiszki zostały pokazane (currentIndex >= cards.length).
  Nie musi być eksportowany jako osobny typ, jeśli stan jest trzymany w useState w SessionView.

- **SessionResult** (opcjonalnie, na przyszłość): pojedynczy wynik oceny w sesji, np. `{ flashcardId: number; grade: SessionGrade; timestamp?: string }`. W pierwszej iteracji można nie zapisywać wyników; w kolejnej — do integracji z algorytmem powtórek i ewentualnym endpointem API.

## 6. Zarządzanie stanem

- Stan zarządzany jest w **SessionView** za pomocą `useState`:
  - `cards: FlashcardDto[]` — lista fiszek z API;
  - `currentIndex: number` — bieżąca pozycja (0-based);
  - `revealed: boolean` — czy tył jest odsłonięty;
  - `sessionEnded: boolean` — czy sesja się zakończyła;
  - `loading: boolean`, `error: string | null` — stan ładowania i błędu pobierania listy.

- **Custom hook `useSessionFlashcards`** (rekomendowany): odpowiedzialny za wywołanie GET `/api/flashcards` z parametrami odpowiednimi do sesji (np. `page=1`, `limit=50`, `sort=created_at_desc`), zwracający `{ data: FlashcardDto[], loading, error, refetch }`. Dzięki temu SessionView nie miesza logiki fetch z logiką sesji (revealed, currentIndex, sessionEnded). Hook może być umieszczony w `src/components/hooks/useSessionFlashcards.ts`.

- Alternatywa: użycie istniejącego `useFlashcardsList` z ustalonym `limit` (np. 50) i `page=1`, a następnie użycie `data` jako `cards`; wtedy stan sesji (currentIndex, revealed, sessionEnded) pozostaje w SessionView. Minus: hook zwraca też paginację i settery (setPage, setSort itd.), które w widoku sesji nie są potrzebne.

- Podsumowując: zalecane jest **useSessionFlashcards** zwracające tylko listę fiszek do sesji oraz `loading`, `error`, `refetch`; reszta stanu (currentIndex, revealed, sessionEnded) w SessionView.

## 7. Integracja API

- **Endpoint**: GET `/api/flashcards`.
- **Parametry zapytania**: `page=1`, `limit=50` (lub 100 — do ustalenia), `sort=created_at_desc`. Opcjonalnie filtr `source` — w pierwszej iteracji można nie stosować (wszystkie źródła).
- **Typ żądania**: brak body; parametry w URL jak w `FlashcardsListQueryParams`: `{ page: number; limit: number; sort: FlashcardsListSort; source?: ... }`.
- **Odpowiedź 200**: `FlashcardsListResponseDto` — `{ data: FlashcardDto[]; pagination: PaginationDto }`. Do sesji używana jest wyłącznie `data`.
- **Błędy**: 400 (nieprawidłowe parametry) — mało prawdopodobne przy stałych parametrach; 401 (brak autoryzacji) — wyświetlić komunikat „Sesja wygasła. Zaloguj się ponownie.” i ewentualnie link do `/login`; 500 — komunikat „Wystąpił błąd. Spróbuj ponownie.” z przyciskiem „Spróbuj ponownie” (refetch).
- **GET `/api/flashcards/{id}`**: nie jest wymagany w podstawowym wariancie widoku sesji (cała partia fiszek jest pobierana jednym wywołaniem listy).

Funkcję wywołującą API można dodać w `src/lib/flashcards-api.ts` (np. `fetchFlashcardsList` jest już dostępna) i użyć jej w `useSessionFlashcards` z ustalonymi parametrami.

## 8. Interakcje użytkownika

| Interakcja | Reakcja |
|------------|---------|
| Wejście na `/session` | Pobranie listy fiszek (GET). Wyświetlenie ładowania, potem pierwszej fiszki lub stanu „Brak fiszek” / błąd. |
| Klik „Pokaż odpowiedź” | Ustawienie `revealed = true`; tył fiszki staje się widoczny, pojawiają się przyciski oceny. |
| Klik przycisku oceny (np. „Źle” / „Średnio” / „Dobrze”) | Zapis oceny (opcjonalnie w stanie na przyszłość), `currentIndex++`, `revealed = false`. Jeśli `currentIndex >= cards.length` — ustawienie `sessionEnded = true` i wyświetlenie SessionSummary. W przeciwnym razie wyświetlenie kolejnej fiszki. |
| Klik „Pomiń” (opcjonalnie) | Jak wyżej, bez zapisu oceny; przejście do następnej fiszki. |
| Klik „Rozpocznij ponownie” (w SessionSummary) | Reset: `currentIndex = 0`, `revealed = false`, `sessionEnded = false` (ta sama lista `cards`). |
| Klik „Wróć do listy fiszek” | Nawigacja do `/flashcards`. |
| Klik „Spróbuj ponownie” (po błędzie) | Wywołanie `refetch` z hooka; ponowne ładowanie listy. |

Dostępność: obsługa klawiatury (Enter/Space na przyciskach), opcjonalnie skróty 1/2/3 dla ocen; po przejściu do następnej fiszki przeniesienie fokusu na kartę lub przycisk „Pokaż odpowiedź”.

## 9. Warunki i walidacja

- **Lista fiszek pusta**: po pomyślnym GET, gdy `data.length === 0` — wyświetlenie komunikatu „Brak fiszek do powtórzenia. Dodaj fiszki w Moje fiszki.” (bez SessionCard i SessionControls).
- **Indeks bieżącej fiszki**: zawsze `0 <= currentIndex < cards.length` podczas wyświetlania karty; po ostatniej ocenie `currentIndex` staje się równe `cards.length`, wtedy pokazywane jest SessionSummary.
- **Odsłonięcie tyłu**: przycisk „Pokaż odpowiedź” widoczny tylko gdy `revealed === false`; przyciski oceny tylko gdy `revealed === true`.
- **API**: 401 — traktowane jako brak autoryzacji (komunikat + link do logowania). 500 — komunikat błędu z możliwością refetch. Nie ma walidacji pól formularza (brak formularzy w tym widoku).

## 10. Obsługa błędów

| Scenariusz | Działanie |
|------------|-----------|
| 401 Unauthorized | Komunikat „Sesja wygasła. Zaloguj się ponownie.” oraz link do `/login`. |
| 500 lub błąd sieci | Komunikat „Wystąpił błąd. Spróbuj ponownie.” i przycisk „Spróbuj ponownie” wywołujący refetch. |
| Pusta lista fiszek | Komunikat „Brak fiszek do powtórzenia. Dodaj fiszki w Moje fiszki.” z linkiem do `/flashcards`. |
| Błąd parsowania odpowiedzi (np. nieoczekiwany JSON) | Traktować jak 500; wyświetlić ogólny komunikat i opcję „Spróbuj ponownie”. |

Toast lub inline: w zależności od konwencji projektu (np. toast dla 401/500 lub blok w miejscu widoku). Spójność z widokiem listy fiszek (FlashcardsView) jest zalecana.

## 11. Kroki implementacji

1. **Middleware**: W `src/middleware/index.ts` dodać obsługę ścieżki `/session` (analogicznie do `/flashcards`): dla niezalogowanego użytkownika przekierowanie na `/login`.

2. **Strona Astro**: Utworzyć plik `src/pages/session.astro` z layoutem i komponentem React `SessionView` (client:load). Upewnić się, że tytuł strony i meta opis są odpowiednie (np. „Sesja powtórek”).

3. **Typy**: W `src/types.ts` dodać ewentualne typy widoku sesji: `SessionGrade` (np. `1 | 2 | 3` lub stałe). Opcjonalnie `SessionResult` na przyszłość.

4. **API / hook**: Zaimplementować hook `useSessionFlashcards` w `src/components/hooks/useSessionFlashcards.ts` wywołujący `fetchFlashcardsList` z parametrami `page=1`, `limit=50`, `sort=created_at_desc`. Zwracać `{ data: FlashcardDto[], loading, error, refetch }`.

5. **SessionProgress**: Utworzyć komponent `SessionProgress` w `src/components/session/` z propsami `currentIndex` (1-based) i `total`. Wyświetlić tekst „Fiszka X z Y”.

6. **SessionCard**: Utworzyć komponent `SessionCard` w `src/components/session/`: przyjmuje `flashcard` i `revealed`; wyświetla przód zawsze, tył tylko gdy `revealed`. Użyć Card (Shadcn) i czytelnej typografii.

7. **SessionControls**: Utworzyć komponent `SessionControls`: przycisk „Pokaż odpowiedź” (gdy `!revealed`), po odsłonięciu — trzy przyciski oceny (np. „Źle”, „Średnio”, „Dobrze”) i opcjonalnie „Pomiń”. Callbacki `onReveal`, `onRate(grade)`, opcjonalnie `onSkip`. Zastosować przyciski Shadcn o wysokim kontraście.

8. **SessionSummary**: Utworzyć komponent `SessionSummary` z propsami `totalReviewed` i `onRestart`; komunikat o zakończeniu sesji oraz przyciski „Rozpocznij ponownie” i „Wróć do listy fiszek” (link do `/flashcards`).

9. **SessionView**: Zaimplementować główny komponent `SessionView`: użycie `useSessionFlashcards`, stan `currentIndex`, `revealed`, `sessionEnded`. Renderowanie warunkowe: ładowanie (skeleton), błąd (komunikat + „Spróbuj ponownie”), brak fiszek (komunikat + link do `/flashcards`), w trakcie sesji (SessionProgress + SessionCard + SessionControls), po zakończeniu (SessionSummary). Obsługa `onReveal`, `onRate`, `onRestart`.

10. **Dostępność i responsywność**: Upewnić się, że przyciski mają aria-label tam gdzie potrzeba; opcjonalnie skróty klawiszowe (1/2/3) dla ocen; responsywny układ (Tailwind) i czytelne rozmiary przycisków na urządzeniach mobilnych.

11. **Nawigacja**: Upewnić się, że w głównym menu/layoutu istnieje link do „Sesja nauki” (`/session`), zgodnie z opisem w ui-plan („Sesja nauki” w nawigacji).

12. **Testy ręczne**: Przetestować przepływ: wejście na `/session` bez fiszek, z jedną fiszką, z wieloma; odsłonięcie tyłu, ocena, przejście do końca sesji, „Rozpocznij ponownie”; obsługa 401/500 (np. symulacja) oraz „Spróbuj ponownie”.
