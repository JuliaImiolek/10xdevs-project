# Architektura UI dla 10xdevs

## 1. Przegląd struktury UI

Interfejs użytkownika został zaprojektowany w oparciu o wymagania produktu, plan API oraz ustalenia sesji planowania. Całość systemu dzieli się na logiczne widoki, które umożliwiają spójną i intuicyjną nawigację, dostarczając użytkownikowi wszystkich niezbędnych informacji i narzędzi do wykonywania podstawowych zadań przy jednoczesnym zapewnieniu wysokiej dostępności oraz bezpieczeństwa.

## 2. Lista widoków

1. **Widok logowania/rejestracji**
   - Ścieżka: `/login` / `/register`
   - Główny cel: Umożliwienie użytkownikowi logowania i rejestracji.
   - Kluczowe informacje: Formularze logowania, informacje o błędach, link do odzyskiwania hasła.
   - Kluczowe komponenty: Formularze, walidatory, przyciski, komunikaty błędów.
   - Uwagi:Prosty formularz, czytelne komunikaty błędó, obsługa klawiatury, zabezpieczenia JWT.

2. **Widok generowania fiszek**
   - Ścieżka: `/generate`
   - Główny cel: Umożliwia użytkowikowi generowanie propozycji fiszek przez AI i ich rewizję (zaakceptuj, edytuj lub odrzuć).
   - Kluczowe informacje: Pole wprowadzania tekstu, lista propozycji fiszek wygenerowanych przez AI, przyciski akceptacji, edycji lub odrzucenia dla każdej fiszki.
   - Kluczowe komponenty: Komponent wejścia tekstowego, przycisk "Generuj fiszki", lista fiszek, przyciski akcji (zapisz wszystkie, zapisz zaakceptowane), wskaźnk ładowania (skeleton), komunikaty o błędach.
   - Uwagi: Intuicyjny formularz, walidacja dłuości tekstu (1000-10000 znaków), responsywność, czytelne komunikaty i inline komunikaty o błędach.

3. **Widok Flashcards (lista fiszek - Moje fiszki)**
   - Ścieżka: `/flashcards`
   - Główny cel: Przegląd, edycja oraz usuwanie zapisanych fiszek.
   - Kluczowe informacje: Lista zapisanych fiszek z informacjami o pytaniu i odpowiedzi, opcje filtrowania i wyszukiwania.
   - Kluczowe komponenty: Karty fiszek, pola wyszukiwania, paginacja lub przewijanie, komponent modal edycji, przyciski usuwania, potwierdzenie operacji.
   - Uwagi: Czytelny układ listy, dostępność klawiaturowa modyfikacji, potwierdzenia usunięcia

5. **Profil użytkownika**
   - Ścieżka: `/profile`
   - Główny cel: Zarządzanie informacjami o konce użytkownika i ustawieniami.
   - Kluczowe informacje: Dane osobowe, opcje edycji profilu, przycisk wylogowania
   - Kluczowe komponenty: Formularze edycji, przyciski akcji.
   - Uwagi: Bezpieczn wylogowanie, łatwy dostęp do ustawień, prosty i czytelny interfejs.

6. **Widok sesji powtórek**
   - Ścieżka: `/session`
   - Główny cel: Umożliwiene przeprowadzenia sesji nauki z fiszkami zgodnie z algorytmem powtóek.
   - Kluczowe informacje: Pokazywanie przodu fiszki, przycisk do odsłonięcia tyłu, mechanizm oceny.
   - Kluczowe komponenty: Komponent wyświetlania fiszki, przycisk interakcji (np. "pokaż odpowiedź", "Ocena"), licznik sesji.
   - Uwagi: Minimalistyczny interfejs skupiony na nauce, responsywność, czytelne przyciski o wysokim kontraście, intuicyjny system przechodzenia między fiszkami.

## 3. Mapa podróży użytkownika

- Użytkownik wchodzi na stronę główną, gdzie widzi przede wszystkim możliwość logowania lub rejestracji.
- Po zalogowaniu zostaje przekierowany do widoku generowania fiszek.
- Użytkownik wprowadza tekst do generowania fiszek i inicjuje proces generacji.
- API zwraca propozycje fiszek, które są prezentowane na widoku generowania.
- Użytkownik przegląda propozycje i decyduje, które fiszki zaakceptować, edytować lub odrzucić (opcjonalne otwarcie modala dycji).
- Użytkownik zatwierdza wybrane fiszki i dokonuje zbiorczego zapisu poprzez interakcję z API.
- Następnie użytkownik przechodzi do widoku "Moje fiszki", gdzie może przegląda, dytować lub usuwać fiszki.
- Użytkownik korzysta z nawigacji, aby odwiedzić panel użytkownika ora opcjonalnie rozpocząc ssję powtórek
- w przypadku błędów (np. walidacji, problemów z API) użytkownik otrzymuje komunikaty inline.

## 4. Układ i struktura nawigacji

- Główna nawigacja dostępna jako górne menu w layoucie strony po zalogowaniu.
- Elementy nawigacyjne: linki do widoków: "Generowanie fiszek", "Moje fiszki", "Sesja nauki", "Profil" oraz przycisk wylogowania.
- Responsywność: W widoku mobilnym nawigacja przekształca się w menu hamburger, umożliwiając łatwy dostęp do pozostałych widoków.
- przepływ: Nawigacja umożliwia bezproblemowe przechodzenie między widokami, zachowują kontekst użytkownika i jego dane sesyjne.

## 5. Kluczowe komponenty

- Formularze uwierzytelnienia: Komponenty logowania i rejestracji z obsługą walidacji.
- Komponent generowania fiszek: Z polem tekstowym i przyciskiem uruchamiającym proces generacji, z wskaźnikiem ładowania.
- Lista fiszek: Interaktywny komponent wyświetlający listę fiszek z opcjami edycji i usuwania.
- Modal edycji: Komponent umożliwiający edycję fiszek z walidacją danych przed zatwierdzeniem.
- Toast notifications: Komponent do wyświetlania komunikatów o sukcesach oraz błędach.
- Menu Nawigacji: Elementy nawigacyjne ułatwiające przemieszczanie się między widokami.
- Komponent sesji powtórek: Interaktywny układ wyświetlania fiszek podczas sesji nauki z mechanizmem oceny.
