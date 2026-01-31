# Dokument wymagań produktu (PRD) - AI Flashcards

## 1. Przegląd produktu
Produkt "10x-cards" to aplikacja webowa umożliwiająca użytkownikom tworzenie fiszek edukacyjnych przy użyciu sztucznej inteligencji oraz manualnie. Rozwiązanie ma na celu zmniejszenie czasu potrzebnego na generowanie fiszek oraz usprawnienie procesu nauki przy zastosowaniu metody spaced repetition. Aplikacja wspiera recenzję, edycję oraz zarządzanie fiszkami w intuicyjnym interfejsie, a także minimalny system zarządzania kontem użytkownika.

## 2. Problem użytkownika
Użytkownicy doświadczają problemu polegającego na czasochłonnym, manualnym tworzeniu fiszek, co obniża efektywność nauki i motywację. Brak narzędzia, które zautomatyzowałoby generowanie wysokiej jakości fiszek, powoduje, że użytkownicy nie korzystają z potencjału metody spaced repetition.

## 3. Wymagania funkcjonalne
- Generowanie fiszek przez AI na podstawie wprowadzonego tekstu (od 1000 do 10000 znaków).
- Manualne tworzenie fiszek przy użyciu prostego formularza; każda fiszka składa się z dwóch pól: "przód" (maks. 200 znaków) i "tył" (maks. 500 znaków).
- Interfejs recenzji propozycji fiszek generowanych przez AI, umożliwiający ich akceptację, edycję lub odrzucenie przed zapisem do bazy danych.
- Prosty system kont użytkowników umożliwiający logowanie, zmianę hasła oraz usuwanie konta.
- Lista fiszek z opcjami wyszukiwania, paginacji oraz edycji (np. poprzez modal).
- Automatyczna walidacja danych na poziomie frontendu, backendu oraz bazy danych z uwzględnieniem limitów znaków i weryfikacji wejścia tekstowego dla AI.
- Integracja z gotowym algorytmem powtórek opartym na bibliotece open-source.
- Logowanie aktywności generowania fiszek przez AI, zapisywane w dedykowanej tabeli bazy danych.
- Stosowanie standardowych praktyk bezpieczeństwa, w tym autentykacji, autoryzacji, RLS oraz walidacji danych wejściowych.

## 4. Granice produktu
- Nie opracowujemy własnego, zaawansowanego algorytmu powtórek (np. w stylu SuperMemo, Anki).
- Brak możliwości importowania fiszek z różnych formatów (PDF, DOCX itp.).
- Funkcja współdzielenia zestawów fiszek między użytkownikami nie jest częścią MVP.
- Brak integracji z innymi platformami edukacyjnymi.
- Na początek nie planujemy wersji mobilnej; produkt będzie dostępny jako aplikacja webowa.

## 5. Historyjki użytkowników
### US-001: Generowanie fiszek przez AI
- Tytuł: Generowanie fiszek przez AI
- Opis: Użytkownik wprowadza tekst (1000–10000 znaków) do modułu generowania, na podstawie którego AI generuje propozycje fiszek (z polami: przód i tył). Przed zapisaniem, użytkownik przegląda i decyduje o akceptacji, edycji lub odrzuceniu każdej propozycji.
- Kryteria akceptacji:
  - Użytkownik może wpisać tekst wejściowy, a system generuje co najmniej jedną propozycję fiszki.
  - pole tekstowe oczekuje od 1000 do 10000 znaków.
  - po kliknięciu przycisku generowania aplikacja komuikuje się z API modelu LLM i wyśietla listę wygenerowanych propozycji fiszek do akceptacji przez użytkownika.
  - Użytkownik ma możliwość edycji lub odrzucenia każdej propozycji przed zapisaniem.
  - Propozycje są walidowane pod kątem limitów: przód do 200 znaków, tył do 500 znaków.

### US-002: Manualne tworzenie fiszek
- Tytuł: Ręczne tworzenie fiszek
- Opis: Użytkownik korzysta z formularza do ręcznego tworzenia fiszek, wypełniając pola "przód" i "tył". Fiszki podlegają walidacji przed zapisaniem do systemu.
- Kryteria akceptacji:
  - Formularz umożliwia wprowadzenie danych do dwóch pól z odpowiednimi limitami znaków.
  - Po zatwierdzeniu, dane są zapisywane do bazy danych i dostępne na liście fiszek.

### US-003: Edycja, przeglądanie i usuwanie fiszek
- Tytuł: Zarządzanie fiszkami
- Opis: Użytkownik może przeglądać listę stworzonych fiszek, wyszukiwać je, edytować poprzez interfejs modal oraz usuwać niepotrzebne fiszki.
- Kryteria akceptacji:
  - Lista fiszek jest wyszukiwalna i paginowana.
  - Fiszki mogą być edytowane lub usuwane z poziomu interfejsu.
  - Każda operacja jest potwierdzana walidacją limitów znaków.

### US-004: Recenzja propozycji fiszek generowanych przez AI
- Tytuł: Recenzja fiszek generowanych przez AI
- Opis: Po wygenerowaniu propozycji przez AI, użytkownik ma możliwość przeglądania wszystkich fiszek w interfejsie recenzji, gdzie dokonuje akceptacji, edycji lub odrzucenia każdej z nich przed zapisem.
- Kryteria akceptacji:
  - System prezentuje wszystkie wygenerowane propozycje fiszek.
  - Użytkownik może zmienić treść fiszki przed zapisaniem.
  - Zmiany są zapisywane zbiorczo do bazy danych po akceptacji.

### US-005: Zarządzanie kontem użytkownika i uwierzytelnianie
- Tytuł: Zarządzanie kontem użytkownika
- Opis: Użytkownik loguje się do systemu, ma możliwość zmiany hasła oraz usunięcia konta. Proces uwierzytelniania zapewnia bezpieczeństwo dostępu.
- Kryteria akceptacji:
  - Użytkownik musi przejść proces logowania przed uzyskaniem dostępu do funkcjonalności aplikacji.
  - Możliwość zmiany hasła i usunięcia konta jest dostępna w ustawieniach konta.
  - System stosuje standardy autentykacji, autoryzacji oraz RLS.
  - Logowanie i rejestracja odbywają się na dedykowanych stronach

### US-006: Bezpieczny dostęp i autoryzacja 
- Tytuł: Jako zalogowany użytkownik chcę mieć pewność, że moje fiszki nie są dostępne dla innych użytkowników, aby zachować prywatność i bezpieczeństwo danych. 
- Kryteria akceptacji:
  - Tylko zalogowany użytkownik może wyświetlać, edytować i usuwać swoje fiszki.
  - Nie ma dostępu do fiszek innych użytkowników ani możliwości współdzielenia.

### US-007: Lista fiszek z wyszukiwarką i paginacją
- Tytuł: Przeglądanie i wyszukiwanie fiszek
- Opis: Użytkownik ma dostęp do interfejsu listy fiszek, gdzie może wyszukiwać, filtrować oraz przeglądać fiszki z podziałem na strony.
- Kryteria akceptacji:
  - Lista fiszek wspiera wyszukiwanie według tekstu w polach "przód" i "tył".
  - Interfejs listy działa z paginacją.
  - Użytkownik może wybrać fiszkę do edycji lub usunięcia.

## 6. Metryki sukcesu
- Co najmniej 75% fiszek wygenerowanych przez AI jest akceptowanych przez użytkowników.
- Przynajmniej 75% fiszek tworzonych w systemie odbywa się z użyciem modułu AI.
- Efektywność walidacji danych oraz bezpieczeństwa systemu na poziomie frontendu, backendu oraz bazy danych.
- Wysoka satysfakcja użytkowników, co potwierdzają logi aktywności i recenzje interfejsu recenzji fiszek.
