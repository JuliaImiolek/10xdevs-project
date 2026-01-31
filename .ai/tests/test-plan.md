# Plan testów — AI Flashcards (10x-cards)

## 1. Wprowadzenie i cele testowania

**Cel dokumentu**  
Plan testów definiuje strategię i zakres weryfikacji aplikacji webowej AI Flashcards (Astro 5, React 19, Supabase, OpenRouter), tak aby produkt spełniał wymagania PRD (US-001–US-007), specyfikację auth oraz kryteria jakości i bezpieczeństwa.

**Cele testowania**  
- Potwierdzenie realizacji wszystkich historyjek użytkownika (US-001–US-007) oraz kryteriów akceptacji z PRD.  
- Weryfikacja bezpieczeństwa: autentykacja, autoryzacja, izolacja danych po `user_id`, brak ujawniania danych innych użytkowników.  
- Zapewnienie poprawności walidacji (front/back, source_text, auth) na froncie i w API.  
- Sprawdzenie integracji z zewnętrznymi systemami (Supabase Auth, OpenRouter) oraz algorytmem SRS (SM-2).  
- Ocena użyteczności i dostępności kluczowych ścieżek (logowanie, generowanie, lista fiszek, sesja powtórek).

**Odbiorcy**  
Zespół deweloperski, QA, Product Owner — jako punkt odniesienia przy planowaniu i raportowaniu testów.

---

## 2. Zakres testów

**W zakresie**  
- Strony i ścieżki: `/`, `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`, `/account`, `/generate`, `/flashcards`, `/session`.  
- API: `/api/auth/*`, `/api/flashcards`, `/api/flashcards/[id]`, `/api/flashcards/[id]/review`, `/api/generations`, `/api/generations/[id]`, `/api/generation-error-logs`.  
- Komponenty React: formularze auth, widoki generowania/listy/sesji, hooki (`useFlashcardGeneration`, `useFlashcardsList`, `useSessionFlashcards`).  
- Warstwa serwisowa: `OpenRouterService`, `GenerationService`, `flashcard.service`, moduł `srs.ts`.  
- Middleware: ochrona ścieżek, ustawianie `locals.userId` i przekierowania.  
- Walidacja: schematy Zod (auth, flashcards, generations, review) oraz reguły biznesowe (limity znaków, source, grade).

**Poza zakresem (w tym dokumencie)**  
- Testy obciążeniowe i długoterminowa stabilność OpenRouter.  
- Szczegółowe testy wydajnościowe bazy (np. benchmarki zapytań).  
- Testy infrastruktury CI/CD i hostingu (DigitalOcean) — jako osobny zakres.

---

## 3. Typy testów do przeprowadzenia

| Typ testów | Opis | Priorytet | Główne obszary |
|------------|------|-----------|----------------|
| **Jednostkowe** | Funkcje i moduły w izolacji (mock zależności). | Wysoki | `srs.ts` (mapowanie ocen, `scheduleReview`, `nextReviewAtFromInterval`), walidacje Zod (auth, flashcards, generations, review), helpery `api-response`, `flashcards-api` (budowanie URL, parsowanie odpowiedzi). |
| **Jednostkowe (komponenty)** | Komponenty React w izolacji (mock API/hooków). | Wysoki | Formularze auth (LoginForm, RegisterForm, ForgotPasswordForm, ResetPasswordForm, ChangePasswordForm, DeleteAccountForm), TextInputArea (walidacja 1000–10000), FlashcardListItem (akcje), SessionCard (oceny 1–3). |
| **Jednostkowe (hooki)** | Hooki React z mockiem `fetch`/API. | Wysoki | `useFlashcardGeneration` (walidacja tekstu, wywołanie POST /generations, zapis fiszek), `useFlashcardsList` (lista, paginacja, filtry), `useSessionFlashcards` (lista due, submit review). |
| **Integracyjne (API)** | Endpointy Astro z prawdziwą lub testową bazą/mock Supabase. | Krytyczny | Wszystkie endpointy auth, flashcards (GET/POST/PUT/DELETE, GET z `forSession`), flashcards/[id]/review, generations (GET/POST), generations/[id], generation-error-logs. Sprawdzenie: status, body, walidacja wejścia, `userId` z `locals`. |
| **Integracyjne (serwisy)** | Serwisy z mockiem Supabase i/lub OpenRouter. | Wysoki | `GenerationService` (wywołanie OpenRouter, zapis generacji, logowanie błędów), `flashcard.service` (CRUD, `listFlashcardsForSession`, `recordReview`). |
| **E2E** | Przepływy użytkownika w przeglądarce. | Krytyczny | Logowanie → przekierowanie; rejestracja; ochrona `/generate`, `/flashcards`, `/session`, `/account`; generowanie fiszek (tekst 1000–10000, zapis); lista fiszek (paginacja, edycja, usuwanie); sesja (karty due, ocena, zapis review). |
| **Bezpieczeństwo / autoryzacja** | Izolacja danych, brak dostępu bez sesji. | Krytyczny | 401 dla API bez cookies/sesji; brak zwracania fiszek/generacji innego użytkownika; middleware blokuje dostęp do chronionych stron; RLS (jeśli włączone) — brak dostępu anon do danych. |
| **Regresja** | Powtórzenie kluczowych scenariuszy po zmianach. | Średni | Skrypt `check-mvp.mjs` jako checklist artefaktów; ręczne lub zautomatyzowane przejście głównych ścieżek. |

---

## 4. Scenariusze testowe dla kluczowych funkcjonalności

### 4.1. Autentykacja i middleware (US-005, US-006)

| ID | Scenariusz | Kroki | Oczekiwany wynik |
|----|------------|--------|-------------------|
| AUTH-01 | Logowanie poprawnymi danymi | Wejście na `/auth/login`, poprawne email/hasło, submit. | 302 na `/generate` lub `redirectTo`; sesja w cookies. |
| AUTH-02 | Logowanie błędnymi danymi | Nieprawidłowy email lub hasło. | 400/401, JSON z komunikatem; brak ujawniania, czy błąd dotyczy emaila czy hasła. |
| AUTH-03 | Rejestracja | `/auth/register`, email + hasło (min. 6 znaków), submit. | Sukces: przekierowanie lub komunikat; ewentualna informacja o potwierdzeniu e-mail. |
| AUTH-04 | Walidacja rejestracji | Hasło &lt; 6 znaków, nieprawidłowy email. | 400, komunikaty walidacji (Zod). |
| AUTH-05 | Wylogowanie | Zalogowany użytkownik, klik „Wyloguj”. | POST `/api/auth/logout`, przekierowanie, brak sesji. |
| AUTH-06 | Odzyskiwanie hasła | `/auth/forgot-password`, email, submit. | Komunikat „Jeśli konto istnieje…” (zawsze ten sam). |
| AUTH-07 | Reset hasła z tokenem | `/auth/reset-password?token=...`, nowe hasło + potwierdzenie. | Sukces: przekierowanie na `/login` lub komunikat. |
| AUTH-08 | Zmiana hasła (zalogowany) | `/account`, obecne + nowe hasło. | Sukces lub 400 przy złym obecnym haśle. |
| AUTH-09 | Usunięcie konta | Potwierdzenie frazą „USUŃ”. | Usunięcie konta, wylogowanie, przekierowanie. |
| AUTH-10 | Chronione ścieżki bez sesji | Niezalogowany: GET `/generate`, `/flashcards`, `/session`, `/account`. | 302 na `/auth/login?redirectTo=...`. |
| AUTH-11 | Strony auth dla zalogowanych | Zalogowany: wejście na `/auth/login`. | 302 na `/generate`. |
| AUTH-12 | API bez sesji | POST `/api/flashcards`, GET `/api/generations` bez cookies. | 401, JSON `Authentication required`. |

### 4.2. Generowanie fiszek (US-001, US-004)

| ID | Scenariusz | Kroki | Oczekiwany wynik |
|----|------------|--------|-------------------|
| GEN-01 | Tekst w zakresie 1000–10000 znaków | Wpisanie poprawnego tekstu, „Generuj”. | POST `/api/generations`, lista propozycji; front ≤200, back ≤500. |
| GEN-02 | Tekst za krótki / za długi | &lt; 1000 lub &gt; 10000 znaków. | Walidacja na froncie i w API (400); komunikaty po polsku. |
| GEN-03 | Akceptacja / edycja / odrzucenie | Zmiana statusu propozycji, edycja treści. | Zapis zbiorczy: tylko zaakceptowane/edycje trafiają do POST `/api/flashcards` z poprawnym `source` i `generation_id`. |
| GEN-04 | Błąd OpenRouter / timeout | Mock błędu lub timeout. | Zapis do `generation_error_logs`, komunikat dla użytkownika (np. ErrorNotification). |
| GEN-05 | Ręczne tworzenie fiszki (US-002) | ManualFlashcardForm: przód, tył. | Walidacja 1–200 / 1–500; POST z `source: "manual"`, `generation_id: null`. |

### 4.3. Lista fiszek i CRUD (US-003, US-007)

| ID | Scenariusz | Kroki | Oczekiwany wynik |
|----|------------|--------|-------------------|
| FL-01 | Lista z paginacją | GET `/api/flashcards?page=1&limit=10&sort=...`. | 200, `data` + `pagination` (page, limit, total). |
| FL-02 | Filtrowanie po source | `source=manual` / `ai-full` / `ai-edited`. | Tylko fiszki z danym source. |
| FL-03 | Lista do sesji | `forSession=true`. | Tylko fiszki z `next_review_at IS NULL OR next_review_at <= now()`, sort po `next_review_at`. |
| FL-04 | Edycja fiszki | PUT `/api/flashcards/[id]`, front/back/source (ai-edited \| manual). | 200, zaktualizowana fiszka; walidacja limitów. |
| FL-05 | Usunięcie fiszki | DELETE `/api/flashcards/[id]`. | 200; przy następnym GET brak tej fiszki. |
| FL-06 | Izolacja użytkownika | User A tworzy fiszkę; User B GET lista / GET by id. | User B nie widzi fiszek User A (401 lub pusta lista / 404). |

### 4.4. Sesja powtórek i SRS (SM-2)

| ID | Scenariusz | Kroki | Oczekiwany wynik |
|----|------------|--------|-------------------|
| SRS-01 | Lista kart do powtórki | Zalogowany, `/session`; GET z `forSession=true`. | Karty z `next_review_at` null lub w przeszłości. |
| SRS-02 | Ocena 1 / 2 / 3 | Klik „Pokaż odpowiedź”, wybór Źle/Średnio/Dobrze. | POST `/api/flashcards/[id]/review` z `grade: 1\|2\|3`; 200. |
| SRS-03 | Aktualizacja SRS po review | Po POST review. | W bazie: zaktualizowane `next_review_at`, `interval_days`, `repetitions`, `ease_factor` zgodnie z SM-2. |
| SRS-04 | Nieprawidłowy grade | Body `grade: 0` lub `4`. | 400, błąd walidacji. |
| SRS-05 | Review cudzej fiszki | User B wysyła POST review dla id fiszki User A. | 404 lub 403. |

### 4.5. Walidacja i edge case’y

| ID | Scenariusz | Oczekiwany wynik |
|----|------------|-------------------|
| V-01 | POST flashcards: front/back przekraczają limity | 400, szczegóły Zod. |
| V-02 | PUT flashcards: source tylko `ai-edited` lub `manual` | 400 przy `ai-full`. |
| V-03 | POST generations: brak `source_text` lub nie-JSON | 400. |
| V-04 | GET flashcards/[id] — nieistniejące id | 404. |
| V-05 | GET generations/[id] — inny user | 404 (brak rekordu dla tego user_id). |

---

## 5. Środowisko testowe

| Środowisko | Przeznaczenie | Konfiguracja |
|------------|----------------|---------------|
| **Lokalne (dev)** | Testy jednostkowe, integracyjne, ręczne E2E. | `npm run dev`; Supabase lokalnie (Docker) lub projekt testowy; zmienne: `PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY` (opcjonalnie mock). |
| **CI (GitHub Actions)** | Jednostkowe i integracyjne przy każdym push/PR. | Node z `.nvmrc`; Supabase w kontenerze lub Supabase preview; sekrety dla testowej bazy; bez realnego OpenRouter w głównym pipeline (mock). |
| **Staging / testowe** | E2E na zbliżonej do prod konfiguracji. | Build `astro build`; DigitalOcean lub inny host; osobny projekt Supabase (testowy); ograniczony lub mock OpenRouter. |

**Dane testowe**  
- Co najmniej jeden użytkownik testowy (np. z `seed-default-user.mjs`).  
- Zestaw fiszek i generacji dla tego użytkownika (różne source, część z `next_review_at` w przeszłości).  
- W testach integracyjnych/E2E — izolacja danych (np. osobny user per test lub czyszczenie po sobie).

---

## 6. Narzędzia do testowania

| Obszar | Rekomendowane narzędzie | Uzasadnienie |
|--------|-------------------------|-------------|
| Testy jednostkowe (TS/React) | **Vitest** | Dobra integracja z Vite/Astro, ESM, szybkie uruchomienie. |
| Komponenty React | **Vitest** + **React Testing Library** | Sprawdzenie zachowania i dostępności bez szczegółów implementacji. |
| Mock HTTP / API | **Vitest** `vi.fn()` / `vi.mock`, ewentualnie **MSW** | Mock `fetch` w hookach i komponentach; mock OpenRouter w serwisach. |
| Testy integracyjne API | **Vitest** lub **Node** + `undici`/`fetch` | Wywołanie endpointów Astro (dev server lub `astro dev`); mock Supabase lub testowa baza. |
| E2E | **Playwright** | Obsługa wielu przeglądarek, trwałe sesje, cookies; dopasowanie do Astro SSR. |
| Lint / formatowanie | **ESLint**, **Prettier** (istniejące) | Wykorzystanie w CI; brak zmian w konfiguracji testów. |
| Pokrycie kodu | **Vitest** `--coverage` (v8/istanbul) | Raport dla `src/lib`, `src/components`, `src/pages/api`. |
| Lista kontrolna MVP | **scripts/check-mvp.mjs** | Weryfikacja obecności plików i fragmentów kodu dla US-001–US-007 i SRS. |

**Sugestia wdrożenia**  
- Dodać do `package.json`: `"test": "vitest"`, `"test:run": "vitest run"`, `"test:e2e": "playwright test"`.  
- W CI: `npm run lint`, `npm run test:run`, opcjonalnie `npm run check-mvp`, osobny job E2E (np. na PR do main).

---

## 7. Harmonogram testów

| Faza | Działania | Odpowiedzialność |
|------|-----------|-------------------|
| **Przed wdrożeniem funkcji** | Wymagania testowe dla US/funkcji; kryteria akceptacji z PRD. | QA + PO / Dev |
| **W trakcie rozwoju** | Testy jednostkowe (srs, walidacje, hooki); testy komponentów; testy integracyjne API (z mockami). | Deweloperzy |
| **Przed mergem** | Pełna suita jednostkowa + integracyjna w CI; przegląd listy check-mvp. | CI + Dev |
| **Cykl release** | E2E na stagingu (auth, generowanie, lista, sesja, izolacja); testy regresji ręcznej dla krytycznych ścieżek. | QA / Dev |
| **Po incydencie** | Regresja obszaru objętego poprawką + powiązanych scenariuszy. | QA / Dev |

Częstotliwość:  
- Jednostkowe i integracyjne: przy każdym pushu do głównej gałęzi i w PR.  
- E2E: przy release lub codziennie na stagingu (w zależności od zasobów).

---

## 8. Kryteria akceptacji testów

- **Zielone testy**  
  Wszystkie zaplanowane testy automatyczne (jednostkowe, integracyjne) przechodzą w CI.

- **E2E**  
  Scenariusze z sekcji 4 (auth, generowanie, lista, sesja, izolacja) zakończone sukcesem na środowisku testowym.

- **Bezpieczeństwo**  
  Brak dostępu do danych innego użytkownika; 401 dla chronionych API bez sesji; middleware i ewentualne RLS działają zgodnie z auth-spec.

- **Walidacja**  
  Limity znaków (front 200, back 500, source_text 1000–10000) oraz reguły auth (hasło, email, token, confirm) egzekwowane na froncie i w API; błędy zwracane w ustalonym formacie JSON.

- **MVP**  
  `node scripts/check-mvp.mjs` kończy się powodzeniem (wszystkie punkty dla US-001–US-007 i SRS spełnione).

- **Jakość**  
  Lint bez błędów; brak znanych krytycznych błędów otwartych przed release.

---

## 9. Role i odpowiedzialności w procesie testowania

| Rola | Odpowiedzialności |
|------|-------------------|
| **Deweloper** | Pisanie i utrzymanie testów jednostkowych oraz integracyjnych dla własnego kodu; poprawa testów przy zmianach; dbanie o działanie CI. |
| **QA / inżynier testów** | Projektowanie scenariuszy E2E, wykonywanie testów ręcznych i E2E, raportowanie błędów, weryfikacja kryteriów akceptacji, przegląd planu testów. |
| **Tech Lead / architekt** | Priorytetyzacja obszarów testowych, decyzje o mockach (OpenRouter, Supabase), standardy pokrycia i CI. |
| **Product Owner** | Akceptacja kryteriów dla US; potwierdzenie, że scenariusze odzwierciedlają PRD. |

---

## 10. Procedury raportowania błędów

- **Treść raportu**  
  Tytuł (krótki opis); kroki reprodukcji; oczekiwane vs aktualne zachowanie; środowisko (przeglądarka, OS, build); załączniki (logi, zrzuty ekranu, odpowiedzi API); priorytet/severity (wg wewnętrznej skali).

- **Severity (propozycja)**  
  **Krytyczny**: brak dostępu do kluczowej funkcji (np. logowanie, generowanie), utrata/ujawnienie danych. **Wysoki**: błędna walidacja, nieprawidłowe dane w sesji/SRS, poważne błędy UI. **Średni**: drobne błędy UI, mniej istotne edge case’y. **Niski**: kosmetyka, sugestie.

- **Ścieżka raportowania**  
  Issues w repozytorium GitHub z szablonem (kroki, środowisko, etykiety: bug, auth, api, srs, ui itd.).

- **Śledzenie**  
  Oznaczenie w issue: powiązana US (US-001–US-007), komponent/endpoint; po naprawie — link do PR i informacja o testach dodanych lub zmodyfikowanych.

---

*Plan testów dla projektu AI Flashcards — wersja 1.0; dostosowany do stosu Astro 5, React 19, Supabase, OpenRouter i struktury repozytorium.*
