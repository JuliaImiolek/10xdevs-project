# API Endpoint Implementation Plan: POST /generations

<analysis>

1. Kluczowe punkty specyfikacji API:
   - Endpoint przyjmuje żądanie POST pod ścieżką `/generations`.
   - Celem jest inicjacja procesu generowania propozycji fiszek (flashcards) opartych na tekście dostarczonym przez użytkownika.
   - Żądanie oczekuje ciała (request body) zawierającego pole `source_text` oraz opcjonalnie dodatkowe ustawienia (np. `metadata`).
   - Walidacja: pole `source_text` nie może być puste i musi mieścić się w określonym zakresie długości (w opisie: 100 - 10000 znaków, uwzględniając potencjalne rozbieżności z walidacją w bazie danych, gdzie wymagany zakres może być inny).
   - Logika biznesowa obejmuje: walidację danych, wywołanie usługi AI do generowania fiszek oraz zapisanie odpowiednich danych (w tabeli `generations`, opcjonalnie powiązanych rekordów w `flashcards`).
   - Odpowiedź zawiera: `generation_id`, tablicę `flashcards_proposals` (z polami `id`, `front`, `back`, `source`) oraz `generated_count`.
   - Statusy: 201 przy pomyślnym utworzeniu, 400 dla problemów z walidacją, oraz 599 dla błędów związanych z usługą AI (przy czym takie błędy powinny być logowane w tabeli `generation_error_logs`).

2. Wymagane i opcjonalne parametry:
   - Wymagane: `source_text` w ciele żądania.
   - Opcjonalne: możliwe dodatkowe parametry w `metadata` dla ustawień generacji (np. dodatkowe opcje konfiguracji, choć nie zostały szczegółowo wymienione w specyfikacji).

3. Niezbędne typy DTO / Command Modele:
   - Request DTO: zawiera pole `source_text` (string) oraz opcjonalnie `metadata` (obiekt dowolnej struktury).
   - Response DTO: zawiera pola `generation_id` (liczba), `flashcards_proposals` (tablica obiektów, każdy z polami: `id`, `front`, `back`, `source`), `generated_count` (liczba).

4. Logika biznesowa / Service Layer:
   - Wyodrębnić logikę generowania fiszek do dedykowanego serwisu (np. `GenerationService`) w katalogu `src/lib/services`.
   - Serwis powinien obsługiwać walidację danych (z użyciem Zod), wywołanie usługi AI oraz zapis wyników do bazy (w tabeli `generations`) i ewentualnie utworzenie rekordów powiązanych z `flashcards`.

5. Walidacja danych wejściowych:
   - Implementacja walidacji przy użyciu Zod zgodnie z regułami projektowymi i specyfikacją (sprawdzić długość `source_text`).

6. Rejestrowanie błędów:
   - W przypadku błędów po stronie usługi AI, błędy powinny być logowane w tabeli `generation_error_logs`.

7. Potencjalne zagrożenia bezpieczeństwa:
   - Uwierzytelnienie: endpoint powinien być chroniony i dostępny tylko dla zalogowanych użytkowników.
   - Walidacja danych wejściowych aby zapobiec atakom typu injection oraz zapewnić, że dane spełniają wymagania długości.
   - Ograniczenie dostępu do zasobów użytkownika przez odpowiednie sprawdzenie `user_id` w kontekście Supabase.

8. Scenariusze błędów i kody stanu:
   - 400: Nieprawidłowe dane wejściowe (np. puste `source_text` lub nieprawidłowa długość).
   - 401: Nieautoryzowany dostęp (jeśli użytkownik nie jest zalogowany).
   - 500: Błędy po stronie serwera związane z operacjami bazy lub innymi nieprzewidzianymi problemami.
   - 599: Błędy po stronie usługi AI (przy czym należy logować te błędy w `generation_error_logs`).

</analysis>

# API Endpoint Implementation Plan: POST /generations

## 1. Przegląd punktu końcowego
Celem endpointu jest inicjacja procesu generowania propozycji fiszek na podstawie tekstu dostarczonego przez użytkownika. Endpoint waliduje dane wejściowe, wywołuje usługę AI, zapisuje wyniki w bazie danych oraz zwraca propozycje fiszek wraz z informacją o liczbie wygenerowanych propozycji.

## 2. Szczegóły żądania
- **Metoda HTTP:** POST
- **Struktura URL:** `/generations`
- **Parametry:**
  - **Wymagane:**
    - `source_text` (string): Tekst od użytkownika, wymagany do wygenerowania propozycji, o długości od 1000 do 10000 znaków (uwzględnić zgodność z wymaganiami bazy, np. minimum 1000 znaków, jeśli to konieczne).
  - **Opcjonalne:** brak
- **Request Body:** JSON zawierający przynajmniej pole `source_text`.

## 3. Wykorzystywane typy
- **Request DTO:**
  ```typescript
  interface GenerationRequestDTO {
    source_text: string;
    metadata?: Record<string, any>;
  }
  ```
- **Response DTO:**
  ```typescript
  interface GenerationResponseDTO {
    generation_id: number;
    flashcards_proposals: Array<{ id: number; front: string; back: string; source: string }>;
    generated_count: number;
  }
  ```
- **Command Model:** Opcjonalnie można wprowadzić model komendy (np. `CreateGenerationCommand`) przekazujący te dane do warstwy serwisu.

## 4. Szczegóły odpowiedzi
- **Przykładowa odpowiedź (Success – 201 Created):**
  ```json
  {
    "generation_id": 101,
    "flashcards_proposals": [
      { "id": 1, "front": "Question 1", "back": "Answer 1", "source": "ai-full" }
    ],
    "generated_count": 5
  }
  ```
- **Kody statusu:**
  - 201: Pomyślne utworzenie
  - 400: Błąd walidacji danych wejściowych
  - 401: Nieautoryzowany dostęp
  - 500: Błąd po stronie serwera
  - 599: Błąd usługi AI (przy czym błąd powinien być dodatkowo logowany w `generation_error_logs`)

## 5. Przepływ danych
1. Klient wysyła żądanie POST do `/generations` z wymaganą treścią w formacie JSON.
2. Warstwa kontrolera odbiera żądanie i przekazuje dane do warstwy walidacji (z użyciem Zod).
3. Po pozytywnej walidacji, kontroler przekazuje dane do `generation.service`.
4. `generation.service` wywołuje usługę AI odpowiedzialną za generowanie fiszek.
5. Wyniki generacji są zapisywane w tabeli `generations` (oraz ewentualnie powiązane wpisy w `flashcards`).
6. W przypadku błędu usługi AI, błąd jest logowany w tabeli `generation_error_logs`.
7. Endpoint zwraca odpowiedź JSON z danymi wygenerowanej sesji.

## 6. Względy bezpieczeństwa
- Endpoint musi być chroniony poprzez mechanizmy uwierzytelniania (np. Supabase Auth) i dostępny tylko dla zalogowanych użytkowników.
- Dane wejściowe muszą być walidowane, aby zapobiec atakom injekcyjnym oraz przekroczeniom limitów (np. minimalna i maksymalna długość tekstu).
- Operacje na bazie danych powinny być wykonywane przy użyciu bezpiecznych zapytań oraz zgodnie z najlepszymi praktykami Supabase.

## 7. Obsługa błędów
- **400 Bad Request:** Gdy dane wejściowe nie spełniają wymagań walidacyjnych (np. `source_text` jest pusty lub nie mieści się w wymaganym zakresie).
- **401 Unauthorized:** Gdy użytkownik nie jest zalogowany lub nie posiada odpowiednich uprawnień.
- **500 Internal Server Error:** Dla nieprzewidzianych błędów serwera lub problemów z bazą danych.
- **599 AI Service Error:** Gdy wystąpi błąd po stronie usługi AI. Błąd ten musi być dodatkowo logowany w tabeli `generation_error_logs`.

## 8. Rozważania dotyczące wydajności
- Optymalizacja: Upewnić się, że wywołanie usługi AI oraz operacje na bazie odbywają się asynchronicznie, aby nie blokować głównego wątku.
- Skalowalność: Monitorowanie obciążenia usługi AI i bazy danych, oraz implementacja mechanizmów ograniczających (rate limiting) w celu zapobiegania przeciążeniom.
- Cache: Rozważyć cache'owanie niektórych wyników, jeśli jest to możliwe bez naruszenia zasad integralności danych.

## 9. Etapy wdrożenia
1. **Przygotowanie środowiska**
   - Upewnić się, że endpoint jest chroniony przez mechanizmy Supabase Auth.
   - Skonfigurować dostęp do bazy danych i połączenie z usługą AI.

2. **Implementacja walidacji**
   - Stworzyć schemat walidacji przy użyciu Zod dla `GenerationRequestDTO`.

3. **Implementacja warstwy serwisu**
   - Utworzyć `GenerationService` w katalogu `src/lib/services` odpowiedzialny za:
     - Wywołanie usługi AI, 
     - Przetwarzanie wyników,
     - Zapis do tabeli `generations`, 
     - (Opcjonalnie) Zapis powiązanych fiszek do tabeli `flashcards`.

4. **Implementacja kontrolera/endpointu**
   - Utworzyć nowy endpoint w katalogu `src/pages/api` (lub zgodnie z ustaleniami projektu) pod ścieżką `/generations`.
   - Integracja z `generation.service`, obsługa walidacji, a następnie odpowiednia odpowiedź.

5. **Logowanie błędów**
   - Dodanie mechanizmu logowania błędów do tabeli `generation_error_logs` w przypadku niepowodzenia usługi AI.


7. **Przegląd i wdrożenie**
   - Code review i ujednolicenie implementacji względem standardów projektu (zgodnie z `shared.mdc`, `backend.mdc` i `astro.mdc`).

8. **Monitoring i optymalizacja**
   - Monitorowanie wydajności endpointu oraz logów błędów.
   - Regularna aktualizacja i optymalizacja mechanizmów walidacji oraz komunikacji z usługą AI.
