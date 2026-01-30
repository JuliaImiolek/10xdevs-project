# Plan implementacji widoku generowania fiszek

## 1. Przegląd
Widok umożliwia użytkownikowi generowanie propozycji fiszek przez AI na podstawie wprowadzonego tekstu (1000–10000 znaków). Użytkownik po wygenerowaniu ma możliwość przejrzenia fiszek oraz wykonania akcji: akceptacji, edycji lub odrzucenia, zanim fiszki zostaną zapisane do bazy.

## 2. Routing widoku
Widok będzie dostępny pod ścieżką: `/generate`.

## 3. Struktura komponentów
- **FlashcardGenerationView** (główny komponent widoku)
  - Zawiera pole tekstowe, przycisk generowania oraz listę propozycji fiszek.
- **TextInputArea**
  - Komponent do wprowadzania tekstu przez użytkownika.
- **FlashcardList**
  - Komponent odpowiedzialny za wyświetlanie listy fiszek wygenerowanych przez AI.
- **FlashcardListItem**
  - Reprezentuje pojedynczą fiszkę z akcjami: akceptacja, edycja, odrzucenie.
- **SkeletonLoader** - komponent wskaźnika łądowania (skeleton), wyświetlony podczas oczekiwania na odpowedź API.
- **BulkSaveButton** - przyiski do zapisu wszystkih fiszek lub tylko zaakceptowaych.
- **ErrorNotification** - komponent do wyświetlania komunikatów o błędach.

## 4. Szczegóły komponentów
### FlashcardGenerationView
- **Opis**: Główny kontener widoku, zarządzający stanem i przepływem danych między komponentami.
- **Główne elementy**: 
  - `TextInputArea` do pobierania tekstu od użytkownika.
  - Przycisk „Generuj fiszki” inicjujący walidację oraz wywołanie API.
  - `FlashcardList` do wyświetlania listy fiszek.
  - `SkeletonLoader` – wyświetlany podczas ładowania danych.
  - `BulkSaveButton` – umożliwia zapis fiszek zbiorczy.
  - `ErrorNotification` – prezentacja komunikatów błędów.
- **Obsługiwane interakcje**: 
  - Kliknięcie przycisku generowania → walidacja tekstu oraz wywołanie API do generowania fiszek.
  - Akcje na poszczególnych fiszkach (akceptacja, edycja, odrzucenie) przekazywane z `FlashcardList`.
- **Warunki walidacji**: 
  - Tekst wejściowy musi mieć między 1000 a 10000 znaków.
- **Typy**: 
  - `GenerationRequestDTO`, `GenerationResponseDTO`.
- **Propsy**: 
  - Brak – komponent zarządza własnym stanem.

### TextInputArea
- **Opis**: Pole tekstowe umożliwiające wprowadzenie treści, która będzie podstawą do generowania propozycji fiszek.
- **Główne elementy**: 
  - Element `<textarea>` z komunikatami o błędach.
- **Obsługiwane interakcje**: 
  - `onChange` – aktualizacja stanu tekstu,
  - `onBlur` – wywołanie walidacji długości.
- **Warunki walidacji**: 
  - Tekst musi mieć długość między 1000 a 10000 znaków.
- **Typy**: 
  - `TextInputAreaViewModel`.
- **Propsy**: 
  - `value`: string,
  - `onChange`: (value: string) => void,
  - `error` (opcjonalnie): string.

### FlashcardList
- **Opis**: Komponent odpowiedzialny za renderowanie listy fiszek.
- **Główne elementy**: 
  - Lista elementów typu `FlashcardListItem`.
- **Obsługiwane interakcje**: 
  - Przekazywanie akcji (akceptacja, edycja, odrzucenie) poprzez zdarzenia do komponentu rodzica.
- **Warunki walidacji**: 
  - Poprawność listy po otrzymaniu danych z API.
- **Typy**: 
  - Tablica `FlashcardViewModel`.
- **Propsy**: 
  - `flashcards`: FlashcardViewModel[],
  - `onAction`: (id: number, action: 'accept' | 'edit' | 'reject') => void.

### FlashcardListItem
- **Opis**: Pojedyncza fiszka wyświetlana na liście, z informacjami i przyciskami do podjęcia akcji.
- **Główne elementy**: 
  - Wyświetlanie pól `front` oraz `back`.
  - Przycisk akceptacji, edycji i odrzucenia.
- **Obsługiwane interakcje**: 
  - Kliknięcia przycisków, które powodują akcje aktualizacji statusu fiszki.
- **Warunki walidacji**: 
  - `front` — niepusty, maksymalnie 200 znaków;
  - `back` — niepusty, maksymalnie 500 znaków.
- **Typy**: 
  - `FlashcardViewModel`.
- **Propsy**: 
  - `flashcard`: FlashcardViewModel,
  - `onAction`: (action: 'accept' | 'edit' | 'reject') => void.

### SkeletonLoader
- **Opis**: Komponent wskaźnika ładowania, prezentowany podczas oczekiwania na odpowiedź API.
- **Główne elementy**: 
  - Dynamiczny szkielet graficzny imitujący strukturę zawartości widoku.
- **Obsługiwane interakcje**: 
  - Wyłącznie wizualny efekt ładowania, bez interakcji użytkownika.
- **Typy**: 
  - Brak specyficznych typów, standardowy komponent prezentacyjny.

### BulkSaveButton
- **Opis**: Komponent umożliwiający zapis wszystkich fiszek lub tylko tych zaakceptowanych.
- **Główne elementy**: 
  - Jeden lub dwa przyciski umożliwiające różne akcje zapisu.
- **Obsługiwane interakcje**: 
  - Kliknięcie przycisku wywołuje akcję zapisania fiszek poprzez wywołanie API.
- **Warunki walidacji**: 
  - Aktywowany tylko gdy istnieją fiszki do zapisu.
- **Typy**: 
  - Powiązany z typem `CreateFlashcardCommand` określającym strukturę danych do zapisu.
- **Propsy**: 
  - `flashcards`: FlashcardViewModel[],
  - `onSave`: (flashcards: CreateFlashcardCommand[]) => void.

### ErrorNotification
- **Opis**: Komponent do wyświetlania komunikatów o błędach globalnych lub specyficznych dla akcji.
- **Główne elementy**: 
  - Element wizualny prezentujący błąd (tekst, ikona) w widocznym miejscu interfejsu.
- **Obsługiwane interakcje**: 
  - Wyświetlanie komunikatów błędów, brak interakcji użytkownika.
- **Typy**: 
  - Standardowy komponent prezentacyjny, opcjonalnie z typem na strukturę błędu.
- **Propsy**: 
  - `errorMessage`: string.

## 5. Typy
- **GenerationRequestDTO**: 
  - `source_text`: string.

- **GenerationResponseDTO**: 
  - `generation_id`: number,
  - `flashcards_proposals`: Flashcard[],
  - `generated_count`: number.

- **Flashcard** (również wykorzystywany przez endpoint `/flashcards`): 
  - `id`: number,
  - `front`: string (max 200 znaków),
  - `back`: string (max 500 znaków),
  - `source`: 'manual' | 'ai-full' | 'ai-edited',
  - `generation_id`: number | null,
  - `created_at`: string (opcjonalne, ustalane przy zapisie).

- **CreateFlashcardCommand**: 
  - Typ definiujący dane przesyłane do endpointu zapisu fiszek. Powinien zawierać:
    - `front`: string (max 200 znaków),
    - `back`: string (max 500 znaków),
    - `source`: 'manual' | 'ai-full' | 'ai-edited',
    - `generation_id`: number | null (w zależności od źródła fiszki).

- **TextInputViewModel**: 
  - `value`: string,
  - `error`: string (opcjonalnie).

- **FlashcardViewModel**: 
  - Rozszerzenie typu `Flashcard` o dodatkowe flagi interfejsowe, np. stan edycji czy selekcji podczas zapisu zbiorczego.

## 6. Zarządzanie stanem
- Użycie wewnętrznych hooków React (`useState`, `useEffect`) do zarządzania stanem tekstu, listą fiszek, stanem ładowania oraz komunikatami o błędach.
- Utworzenie customowego hooka `useFlashcardGeneration`, który: 
  - Zarządza logiką wywołań API (zarówno `/generations` jak i `/flashcards`), 
  - Obsługuje walidację danych wejściowych, 
  - Aktualizuje stan widoku w oparciu o odpowiedzi serwera.

## 7. Integracja API
- **Wywołanie POST `/generations`**:
  - Żądanie: `{ "source_text": "..." }`
  - Odpowiedź: Obiekt zawierający `generation_id` oraz listę fiszek (`flashcards_proposals`).
- **Wywołanie POST `/flashcards`**:
  - Używane do zapisu fiszek, gdzie dane przesyłane powinny być zgodne z typem `CreateFlashcardCommand`.
  - Pojedyncze lub zbiorcze wywołanie, w zależności od akcji użytkownika (BulkSave przyjmujący listę fiszek do zapisania).
  - Walidacja pól: `front` (max 200 znaków), `back` (max 500 znaków), `source` jako obowiązkowe, zgodność `generation_id` przy źródle AI.
- Integracja realizowana za pomocą wywołań HTTP (np. `fetch` lub axios) z obsługą stanów ładowania i błędów.

## 8. Interakcje użytkownika
- Użytkownik wprowadza tekst w komponencie `TextInput`.
- Kliknięcie przycisku „Generuj fiszki” uruchamia:
  - Walidację tekstu,
  - Wywołanie API `/generations`, z wyświetleniem `SkeletonLoader` podczas przetwarzania.
- Po otrzymaniu danych, `FlashcardList` prezentuje wygenerowane fiszki:
  - Użytkownik może zaakceptować, edytować lub odrzucić pojedyncze fiszki (akcje obsługiwane w `FlashcardItem`).
  - Po zakończeniu recenzji, `BulkSaveButton` umożliwia zapisanie wszystkich lub tylko zaakceptowanych fiszek nowym wywołaniem API do `/flashcards`.
- W przypadku błędów (np. z API lub walidacji), `ErrorNotification` wyświetla komunikaty, umożliwiając użytkownikowi podjęcie dalszych działań.

## 9. Warunki i walidacja
- **Tekst wejściowy**: musi mieć długość od 1000 do 10000 znaków.
- **Fiszki**:
  - `front`: niepusty, maksymalnie 200 znaków.
  - `back`: niepusty, maksymalnie 500 znaków.
- Spójność danych między odpowiedzią API (`/generations`) a typami wykorzystywanymi w `CreateFlashcardCommand` do zapisu fiszek.
- Walidacja odbywa się na poziomie komponentów przed wysłaniem żądania oraz przy obsłudze odpowiedzi błędów z serwera.

## 10. Obsługa błędów
- Walidacja pola tekstowego – komunikaty przy niepoprawnej długości.
- Globalna obsługa błędów API – `ErrorNotification` prezentuje komunikaty błędów.
- Indywidualna walidacja dla fiszek podczas edycji – komunikaty inline w `FlashcardItem`.

## 11. Kroki implementacji
1. Utworzenie widoku dostępnego pod ścieżką `/generate` oraz konfiguracja routingu.
2. Stworzenie głównego komponentu `FlashcardGenerationView` wraz z integracją dodatkowych elementów interfejsu (`SkeletonLoader`, `BulkSaveButton`, `ErrorNotification`).
3. Implementacja komponentu `TextInput` z walidacją długości tekstu.
4. Utworzenie customowego hooka `useFlashcardGeneration` do zarządzania wywołaniami API oraz stanem widoku.
5. Implementacja komponentu `FlashcardList` oraz komponentu `FlashcardItem` do prezentacji wygenerowanych fiszek, wraz z obsługą akcji akceptacji, edycji i odrzucenia.
6. Integracja przycisku „Generuj fiszki” z wywołaniem API `/generations` oraz przetwarzanie odpowiedzi do aktualizacji listy fiszek.
7. Implementacja logiki zapisu fiszek:
   - Użycie komponentu `BulkSaveButton` do zbiorczego zapisu.
   - Wywołanie endpointu `/flashcards` z danymi w formacie `CreateFlashcardCommand`.
8. Dodanie wskaźników ładowania (`SkeletonLoader`) oraz mechanizmu wyświetlania błędów (`ErrorNotification`).
9. Testowanie interakcji użytkownika, walidacji i integracji API.
10. Finalne testy i optymalizacja kodu oraz dostosowanie interfejsu zgodnie z feedbackiem.
