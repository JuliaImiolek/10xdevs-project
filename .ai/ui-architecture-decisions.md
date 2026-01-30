# Decyzje architektury UI (MVP)

Dokument zbiera zatwierdzone decyzje dotyczące interfejsu użytkownika, aby wykorzystać je przy tworzeniu szczegółowej architektury UI, map podróży użytkownika i struktury nawigacji.

---

## A. Główne widoki

1. **Ekran auth** – logowanie (i ewentualnie rejestracja).
2. **Dashboard** – ekran główny po zalogowaniu (punkt wejścia do pozostałych widoków).
3. **Widok generowania fiszek** – wprowadzanie tekstu (1000–10000 znaków), wywołanie generowania AI, recenzja propozycji (lista z akceptacją/edycją/odrzuceniem), bulk zapis.
4. **Widok listy fiszek** – lista z wyszukiwaniem i paginacją, modal do edycji, przycisk do usuwania.
5. **Panel użytkownika** – ustawienia konta (zmiana hasła, usunięcie konta).
6. **Ekran sesji powtórkowych** – nauka metodą spaced repetition.

---

## B. Przepływ użytkownika (generowanie)

- Użytkownik loguje się → **początkowo kierowany do widoku generowania z AI** (nie do dashboardu jako pierwszego kroku).
- W widoku generowania: wprowadza tekst → uruchamia generowanie (POST `/generations`) → otrzymuje listę propozycji w odpowiedzi API → wyświetla się lista do recenzji.
- Recenzja: jednostkowa akceptacja, edycja lub odrzucenie każdej propozycji.
- **Finalny zapis zbiorczy**: przycisk „Zapisz wszystkie” lub „Zapisz zatwierdzone” → jeden request POST `/flashcards` z tablicą zatwierdzonych/edytowanych fiszek (bez zapisu pojedynczych fiszek w trakcie recenzji).

---

## C. Zgodność z API

- Struktura endpointów i payloadów zgodna z `.ai/api-plan.md`.
- Propozycje fiszek **nie są pobierane osobnym GET** – pochodzą z odpowiedzi POST `/generations` (`flashcards_proposals`) i są wyświetlane jako lista recenzji w tym samym widoku.
- Lista fiszek w widoku „Lista fiszek” korzysta z GET `/flashcards` (paginacja, sort, order); edycja – PUT `/flashcards/{id}`; usuwanie – DELETE `/flashcards/{id}`; tworzenie ręczne / bulk po recenzji – POST `/flashcards`.

---

## D. Uwierzytelnianie

- **JWT** – wdrożenie planowane na późniejszym etapie; na ten moment założenie: chronione endpointy będą wymagały tokena w nagłówku `Authorization`, a UI będzie przygotowane pod przyszłą integrację (np. przekierowanie na auth przy 401).

---

## E. Komponenty UI

- **Shadcn/ui** jako główne źródło komponentów (formularze, przyciski, modale, lista, nawigacja itd.).

---

## F. Zarządzanie stanem

- **Na start**: wbudowane mechanizmy React – hooki (`useState`, `useEffect` itd.) oraz **React Context**.
- **Zustand** – dodać tylko wtedy, gdy zajdzie taka potrzeba (np. współdzielony stan między wieloma widokami bez prop drilling).

---

## G. Komunikaty błędów

- **Inline** – błędy walidacji i błędy API wyświetlane przy polach/formularzach (np. pod inputem, w sekcji formularza), bez globalnych toastów jako podstawy.

---

## H. Responsywność

- **Tailwind utility variants**: `sm`, `md`, `lg` itd. do adaptacji layoutu i komponentów do różnych rozdzielczości (desktop first, z uwzględnieniem mniejszych ekranów).

---

## I. Nawigacja

- **Navigation Menu** z Shadcn/ui w formie **topbara** (górny pasek nawigacji) – linki do: Dashboard, Generowanie fiszek, Lista fiszek, Sesja powtórek, Panel użytkownika; na ekranie auth – bez topbara lub uproszczony (np. tylko logo / powrót do logowania).

---

## Podsumowanie do kolejnego etapu

Do wykorzystania przy tworzeniu:

- **Szczegółowej architektury UI** – komponenty per widok, dane z API, stany ładowania/błędów.
- **Map podróży użytkownika** – ścieżki od logowania przez generowanie → recenzja → zapis → lista / sesja powtórek.
- **Struktury nawigacji** – trasy (URL), hierarchia widoków, zachowanie topbara (Navigation Menu) i przekierowania po auth.
