# Specyfikacja techniczna: moduł rejestracji, logowania i odzyskiwania hasła

Dokument opisuje architekturę i kontrakty modułu uwierzytelniania zgodnie z US-005 i US-006 z PRD oraz ze stackiem technologicznym (.ai/tech-stack.md). Aplikacja pozostaje w pełni zgodna z istniejącą funkcjonalnością (generowanie fiszek, lista fiszek, sesja nauki, API fiszek i generacji).

### Mapowanie na PRD (User Stories)

| User Story | Realizacja w auth-spec |
|------------|------------------------|
| **US-005** (zarządzanie kontem, uwierzytelnianie) | Logowanie i rejestracja na dedykowanych stronach `/login`, `/register`; zmiana hasła i usunięcie konta na `/account`; middleware wymusza logowanie przed dostępem do funkcjonalności; Supabase Auth + RLS (p. 3.4). |
| **US-006** (bezpieczny dostęp, autoryzacja) | Ścieżki chronione wymagają `context.locals.userId`; API fiszek i generacji filtruje po `userId`; RLS na tabelach; brak współdzielenia (p. 2.4, 3.4). |
| **US-001–US-004, US-007** (funkcjonalność fiszek i generacji) | Nie są zmieniane; dostęp do nich wymaga zalogowania (middleware chroni `/`, `/generate`, `/flashcards`, `/session`), więc realizacja US-005/US-006 zapewnia, że te historyjki działają wyłącznie dla zalogowanych użytkowników. |

Wymagania funkcjonalne z sekcji 3 PRD („logowanie, zmiana hasła oraz usuwanie konta”) oraz zdanie „Logowanie i rejestracja odbywają się na dedykowanych stronach” z US-005 są w pełni pokryte przez opisane strony, endpointy i przepływy. Odzyskiwanie hasła (`/forgot-password`, `/reset-password`) nie jest wymienione w PRD explicite, ale stanowi standardową część „prostego systemu kont” i nie koliduje z żadnym wymaganiem.

---

## 1. Architektura interfejsu użytkownika

### 1.1. Przegląd zmian w warstwie frontendu

**Nowe strony Astro (server-rendered):**

| Ścieżka | Opis | Dostęp |
|--------|-----|--------|
| `/login` | Logowanie (email + hasło) | Tylko niezalogowani; po zalogowaniu przekierowanie na stronę docelową (redirectTo) lub `/generate` |
| `/register` | Rejestracja (email + hasło) | Tylko niezalogowani |
| `/forgot-password` | Żądanie resetu hasła (email) | Tylko niezalogowani |
| `/reset-password` | Ustawienie nowego hasła (token z linku e-mail) | Publiczna; token w query |
| `/account` | Ustawienia konta: zmiana hasła, usunięcie konta | Tylko zalogowani |

**Strony istniejące – rozszerzenie:**

- **`/`, `/generate`, `/flashcards`, `/session`** — bez zmiany ścieżek; dostęp do `/generate`, `/flashcards`, `/session` wymaga zalogowania (middleware). Strony te nie muszą same sprawdzać sesji; otrzymują `userId` z `Astro.locals` tam, gdzie jest potrzebne do SSR (jeśli w przyszłości będzie używane).
- **Layout** — rozszerzenie nawigacji o stan auth: dla niezalogowanych — linki „Zaloguj” / „Zarejestruj”; dla zalogowanych — link „Ustawienia konta” oraz akcja „Wyloguj”.

**Strona główna (`/`):** 

Strona główna jest dostępna tylko dla zalogowanych użytkowników (middleware przekierowuje niezalogowanych na `/login`). Po zalogowaniu lub rejestracji użytkownik jest przekierowywany na `/generate`.

### 1.2. Layouty i tryb auth / non-auth

- **Layout bazowy (`src/layouts/Layout.astro`):**
  - Obecna nawigacja (Strona główna, Generuj fiszki, Moje fiszki, Sesja nauki) pozostaje — widoczna tylko dla zalogowanych (strony auth mogą używać tego samego layoutu lub AuthLayout).
  - **Rozszerzenie:** w sekcji nawigacji dodany blok zależny od `Astro.locals.userId`:
    - Gdy `userId` brak — link „Zaloguj” (`/login`), link „Zarejestruj” (`/register`).
    - Gdy `userId` jest — link „Ustawienia konta” (`/account`), przycisk/link „Wyloguj” (POST do `/api/auth/logout` lub GET z przekierowaniem — zgodnie z wybranym endpointem).
  - Layout nie wykonuje przekierowań; przekierowania realizuje middleware (strony chronione vs strony auth).

- **Layout dla stron auth (opcjonalnie):**  
  Można wydzielić `AuthLayout.astro` dla `/login`, `/register`, `/forgot-password`, `/reset-password` (np. wąska kolumna, brak pełnego menu aplikacji), aby odróżnić je wizualnie od głównej aplikacji. Nie jest to wymagane — można używać jednego Layoutu z innym układem treści na tych stronach.

- **Strony auth:**  
  Na `/login`, `/register`, `/forgot-password` middleware przekierowuje już zalogowanych użytkowników (np. na `/generate`), więc te strony renderują się tylko dla niezalogowanych. Strona `/reset-password` jest publiczna, ale wymaga ważnego tokena w query.

### 1.3. Rozdzielenie odpowiedzialności: Astro vs React

**Strony Astro:**

- Definiują strukturę strony (Layout, nagłówki, aria-label).
- Przekazują do komponentów React ewentualne początkowe dane (np. `redirectUrl` z query dla `/login`).
- Na `/login`, `/register`, `/forgot-password`, `/reset-password` — renderują odpowiedni formularz React (jeden komponent na stronę).
- Na `/account` — renderują widok ustawień konta (zmiana hasła, usunięcie konta); formularze mogą być React (zalecane ze względu na walidację i komunikaty).

**Komponenty React (client-side):**

- **LoginForm** — pola: email, hasło; submit → POST `/api/auth/login` (lub `signin`); obsługa błędów i stanu ładowania; po sukcesie przekierowanie (response redirect lub `window.location` w zależności od API).
- **RegisterForm** — email, hasło, ewentualnie potwierdzenie hasła; submit → POST `/api/auth/register`; informacja o konieczności potwierdzenia e-mail (jeśli Supabase to włączy); link do `/login`.
- **ForgotPasswordForm** — pole email; submit → POST `/api/auth/forgot-password`; komunikat „Jeśli konto istnieje, wysłaliśmy link…” (bez ujawniania, czy e-mail jest w systemie).
- **ResetPasswordForm** — nowe hasło, potwierdzenie; token z URL (Astro przekazuje go do komponentu); submit → POST `/api/auth/reset-password` z tokenem i nowym hasłem.
- **AccountSettingsView** (lub dwa osobne: **ChangePasswordForm**, **DeleteAccountForm**) — zmiana hasła (obecne hasło, nowe, potwierdzenie) → POST `/api/auth/change-password`; usunięcie konta (potwierdzenie, np. wpisanie frazy) → DELETE `/api/auth/account` lub POST `/api/auth/delete-account`.

Integracja z backendem: formularze React wysyłają żądania do API Astro (`src/pages/api/auth/...`). Odpowiedzi: przekierowanie (302) przy sukcesie logowania/rejestracji/wylogowania/resetu; JSON z błędami (400/401/500) do wyświetlenia w UI. Nawigacja po sukcesie: po stronie serwera (redirect) lub klienta (np. `window.location`), spójnie z resztą aplikacji.

### 1.4. Walidacja i komunikaty błędów

**Walidacja po stronie klienta (React):**

- Email: format (np. regex lub type="email"), wymagane.
- Hasło (logowanie/rejestracja): wymagane; przy rejestracji — minimalna długość (np. 6 znaków, zgodnie z polityką Supabase).
- Potwierdzenie hasła: zgodność z polem „hasło”.
- Reset/zmiana hasła: nowe hasło + potwierdzenie, te same reguły co przy rejestracji.

**Komunikaty:**

- Błędy z API (400, 401, 500) — wyświetlane nad formularzem lub przy polu (np. pole email przy „Invalid login credentials”).
- Mapowanie typowych błędów Supabase na przyjazne komunikaty po polsku (np. „Nieprawidłowy email lub hasło”, „Ten adres e-mail jest już używany”, „Link do resetu wygasł”).
- Sukces: np. „Link do resetu hasła został wysłany” na `/forgot-password`; po zmianie hasła — przekierowanie i ewentualny toast/komunikat na `/account`.

**Dostępność:**  
Komunikaty błędów powiązane z polami (aria-describedby, aria-invalid); przyciski submit z obsługą stanu ładowania (disabled + aria-busy lub tekst „Logowanie…”).

### 1.5. Najważniejsze scenariusze użytkownika

1. **Logowanie:** Wejście na `/login` → wypełnienie formularza → POST → sukces: przekierowanie na `/generate` lub zapisaną stronę docelową; błąd: komunikat bez ujawniania, czy problemem jest email czy hasło.
2. **Rejestracja:** Wejście na `/register` → wypełnienie formularza → POST → sukces: przekierowanie na `/login` i komunikat o e-mailu potwierdzającym (jeśli włączone w Supabase); błąd: np. „Email już używany” lub inne z API.
3. **Wylogowanie:** Klik „Wyloguj” w nawigacji → żądanie do endpointu wylogowania → usunięcie sesji i przekierowanie na `/login`.
4. **Odzyskiwanie hasła:** Wejście na `/forgot-password` → podanie email → POST → komunikat „Jeśli konto istnieje…”; użytkownik klika link w e-mailu → wejście na `/reset-password?token=...` → ustawienie nowego hasła → POST → sukces: przekierowanie na `/login` z komunikatem.
5. **Zmiana hasła (zalogowany):** Wejście na `/account` → sekcja „Zmiana hasła” → obecne hasło, nowe, potwierdzenie → POST → sukces: komunikat; błąd: np. „Obecne hasło jest nieprawidłowe”.
6. **Usunięcie konta:** Wejście na `/account` → sekcja „Usuń konto” → potwierdzenie (np. checkbox + wpisanie „USUŃ”) → żądanie DELETE/POST → sukces: wylogowanie i przekierowanie na `/login` z komunikatem (np. „Konto zostało usunięte”).

---

## 2. Logika backendowa

### 2.1. Endpointy API i modele danych

Wszystkie endpointy w `src/pages/api/auth/` z `export const prerender = false`. Spójny format odpowiedzi JSON: `json()` z `src/lib/api-response.ts`; błędy: `{ error: string, message?: string }` (opcjonalnie `details` dla walidacji Zod).

**Endpointy:**

| Metoda | Ścieżka | Opis | Body/Query |
|--------|---------|------|------------|
| POST | `/api/auth/register` | Rejestracja | `{ email, password }` |
| POST | `/api/auth/login` | Logowanie (ustawienie sesji w cookies) | `{ email, password }`; opcjonalnie `redirectTo` |
| POST | `/api/auth/logout` | Wylogowanie (usunięcie cookies sesji) | — |
| POST | `/api/auth/forgot-password` | Wysłanie linku resetu hasła | `{ email }` |
| POST | `/api/auth/reset-password` | Ustawienie nowego hasła (token z linku) | `{ token, new_password }` |
| POST | `/api/auth/change-password` | Zmiana hasła (zalogowany użytkownik) | `{ current_password, new_password }` |
| DELETE lub POST | `/api/auth/account` lub `/api/auth/delete-account` | Usunięcie konta (wymaga zalogowania) | Opcjonalnie potwierdzenie |

**Modele (Zod) — zgodnie z praktyką projektu:**

- `register`: email (format + wymagane), password (min length np. 6).
- `login`: email, password (wymagane).
- `forgot-password`: email (wymagany, format).
- `reset-password`: token (string, wymagany), new_password (jak wyżej).
- `change-password`: current_password, new_password (wymagane, new_password z regułami).
- Odpowiedzi: przy sukcesie logowania/rejestracji — redirect; przy błędzie — JSON 400/401/500.

Schematy Zod w plikach endpointów lub w współdzielonym module `src/lib/validations/auth.ts` (rekomendowane).

### 2.2. Walidacja danych wejściowych

- Każdy endpoint parsuje body (JSON lub form-data w zależności od umowy z frontem) i waliduje go schematem Zod.
- Błąd walidacji → 400, body: `{ error: "Validation error", message: "...", details?: ZodError.format() }`.
- Po walidacji wywołanie Supabase Auth; błędy Supabase mapowane na kody HTTP (np. 401 dla invalid credentials, 400 dla duplicate email, 500 dla błędów serwera).

### 2.3. Obsługa wyjątków

- Try/catch wokół operacji Supabase; nieprzechwycone błędy → 500 z ogólnym komunikatem (bez ujawniania stacku).
- Logowanie błędów po stronie serwera (np. `console.error` lub logger) dla 500 i istotnych 401/400.
- Dla `forgot-password` zawsze zwracać ten sam komunikat sukcesu („Jeśli konto istnieje…”), niezależnie od wyniku Supabase (ograniczenie enumeracji użytkowników).

### 2.4. Aktualizacja sposobu renderowania i użycia sesji

- **Middleware** (punkt 3): ustawia `context.locals.supabase` (klient z sesją z cookies) oraz `context.locals.userId` na podstawie sesji Supabase. Chronione ścieżki: brak sesji → redirect na `/login` (z opcjonalnym `redirectTo`).
- **API istniejące** (`/api/flashcards`, `/api/flashcards/[id]`, `/api/generations`, `/api/generations/[id]`, `/api/generation-error-logs`): zamiast `DEFAULT_USER_ID` używać `context.locals.userId` z `context` Astro. Gdy `!context.locals.userId` → 401 JSON (bez zmian w sygnaturach serwisów; serwisy nadal przyjmują `userId` jako argument).
- **Astro `output: "server"`** (obecna konfiguracja w `astro.config.mjs`) pozostaje; wszystkie strony auth i chronione są renderowane po stronie serwera. Adapter Node (`@astrojs/node`) bez zmian. Brak potrzeby zmiany `astro.config.mjs` pod kątem auth poza ewentualnym dodaniem zmiennych środowiskowych w dokumentacji.

---

## 3. System autentykacji

### 3.1. Wykorzystanie Supabase Auth

- **Rejestracja:** `supabase.auth.signUp({ email, password })`. Opcjonalnie: `emailRedirectTo` dla potwierdzenia e-mail (konfiguracja w Supabase Dashboard). Odpowiedź: redirect na `/login` lub JSON z informacją o konieczności potwierdzenia.
- **Logowanie:** `supabase.auth.signInWithPassword({ email, password })`. Po sukcesie sesja musi trafić do cookies (patrz 3.2).
- **Wylogowanie:** `supabase.auth.signOut()` oraz usunięcie cookies sesji po stronie odpowiedzi.
- **Odzyskiwanie hasła:** `supabase.auth.resetPasswordForEmail(email, { redirectTo: baseUrl + '/reset-password' })`. Link w e-mailu prowadzi do Supabase, potem przekierowanie z tokenem na `/reset-password?token=...` (zgodnie z konfiguracją Supabase). Ustawienie nowego hasła: `supabase.auth.updateUser({ password: new_password })` z sesją ustawioną przez token (exchange code/session z query).
- **Zmiana hasła (zalogowany):** `supabase.auth.updateUser({ password: new_password })` przy użyciu klienta z sesją użytkownika (cookie).
- **Usunięcie konta:** Usunięcie użytkownika z Supabase (np. przez Admin API z kluczem service_role w bezpiecznym endpoincie lub przez funkcję Edge) — w specyfikacji przyjmuje się endpoint serwerowy, który po weryfikacji sesji wywołuje usunięcie konta (szczegóły w dokumentacji Supabase). Po usunięciu — wylogowanie i przekierowanie.

### 3.2. Połączenie Supabase Auth z Astro (SSR)

- **Pakiet:** `@supabase/ssr` (zalecany) do przechowywania sesji w cookies i odświeżania tokenów w middleware. Alternatywnie: ręczne ustawianie cookies (`sb-access-token`, `sb-refresh-token`) jak w przewodniku Astro (docs.astro.build), przy zachowaniu spójności z odświeżaniem sesji.
- **Dwa typy klientów:**
  - **Serwer (middleware i API):** tworzenie klienta z `createServerClient` z `@supabase/ssr`, z funkcjami `getAll`/`setAll` opartymi na `Astro.cookies` (w middleware) lub `cookies` w API route. W każdym żądaniu: odczyt sesji z cookies, ewentualne odświeżenie tokena, zapis zaktualizowanych cookies do odpowiedzi. W middleware ten klient jest używany do `getUser()` (zalecane zamiast `getSession()` w SSR) i ustawienia `context.locals.userId` oraz `context.locals.supabase`.
  - **Przeglądarka:** `createBrowserClient` z `@supabase/ssr` w pliku np. `src/db/supabase.browser.ts` (lub w `lib`), używany w komponentach React tylko wtedy, gdy potrzebna jest reakcja na zmiany auth (np. przekierowanie po wylogowaniu w SPA). Formularze mogą działać wyłącznie przez fetch do API Astro, bez bezpośredniego użycia Supabase w przeglądarce.
- **Plik klienta serwerowego:** Obecny `src/db/supabase.client.ts` zostaje zastąpiony lub uzupełniony: w middleware nie używa się globalnego singletona, lecz klienta tworzonego per-request z dostępem do request/response cookies (przez `@supabase/ssr`). Endpointy API w Astro otrzymują klienta z `context.locals.supabase` (ustawionego w middleware), tak aby każdy request miał poprawną sesję. Zgodnie z regułami projektu: „Use supabase from context.locals in Astro routes instead of importing supabaseClient directly”.
- **Typ:** Typ `SupabaseClient` z `src/db/supabase.client.ts` (obecnie oparty na `createClient<Database>`) powinien pozostać kompatybilny z typem zwracanym przez `createServerClient`/`createBrowserClient` (generics Database); w razie rozbieżności — eksport typu z jednego miejsca i użycie w całej aplikacji.

### 3.3. Przepływ middleware

1. Na początku żądania: utworzenie klienta Supabase dla serwera z cookies (request).
2. Pobranie użytkownika: `getUser()` (lub po odświeżeniu sesji odpowiednik), ustawienie `context.locals.userId = user?.id ?? undefined` i `context.locals.supabase = supabase`.
3. Odświeżenie tokena: zgodnie z dokumentacją `@supabase/ssr` — po wywołaniach auth, zaktualizowane cookies muszą trafić do response (setAll na obiekcie response).
4. Ścieżki chronione (`/`, `/generate`, `/flashcards`, `/flashcards/*`, `/session`, `/session/*`, `/account`): jeśli `!context.locals.userId` → `context.redirect('/login?redirectTo=' + encodeURIComponent(pathname))`.
5. Ścieżki „tylko dla gości” (`/login`, `/register`, `/forgot-password`): jeśli `context.locals.userId` → redirect na `redirectTo` z query lub na `/generate` (zgodnie z założeniem, że po zalogowaniu użytkownik trafia na `/generate`).
6. Wywołanie `next()`.

Strona `/reset-password` nie wymaga zalogowania; weryfikacja tokena odbywa się w endpoincie `POST /api/auth/reset-password`.

### 3.4. Zgodność z US-005 i US-006

- **US-005:** Logowanie i rejestracja na dedykowanych stronach; zmiana hasła i usunięcie konta w ustawieniach konta; stosowanie standardów autentykacji (Supabase), autoryzacji (userId w API i RLS) oraz RLS (istniejące tabele już mają `user_id`; polityki RLS muszą być włączone i oparte na `auth.uid()`, zgodnie z migracjami projektu).
- **US-006:** Tylko zalogowany użytkownik widzi i modyfikuje swoje fiszki; API zawsze filtruje po `context.locals.userId`; RLS na tabelach `flashcards`, `generations`, `generation_error_logs` zapewnia brak dostępu do danych innych użytkowników. Brak współdzielenia — bez zmian.

---

## 4. Podsumowanie komponentów i modułów

| Element | Lokalizacja / opis |
|--------|---------------------|
| Strony | `src/pages/login.astro`, `register.astro`, `forgot-password.astro`, `reset-password.astro`, `account.astro` |
| Formularze React | `src/components/auth/LoginForm.tsx`, `RegisterForm.tsx`, `ForgotPasswordForm.tsx`, `ResetPasswordForm.tsx`; w ustawieniach: `ChangePasswordForm.tsx`, `DeleteAccountForm.tsx` (lub jeden `AccountSettingsView.tsx`) |
| Layout | Rozszerzenie `src/layouts/Layout.astro` o nawigację auth |
| Endpointy API | `src/pages/api/auth/register.ts`, `login.ts`, `logout.ts`, `forgot-password.ts`, `reset-password.ts`, `change-password.ts`, `delete-account.ts` (lub `account.ts` z DELETE) |
| Walidacja | Schematy Zod w `src/lib/validations/auth.ts` lub przy endpointach |
| Klient Supabase (serwer) | Tworzenie w middleware z `@supabase/ssr`; dostęp przez `context.locals.supabase` |
| Klient Supabase (przeglądarka) | `src/db/supabase.browser.ts` (opcjonalnie, gdy React ma korzystać z Supabase po stronie klienta) |
| Middleware | `src/middleware/index.ts` — integracja z `@supabase/ssr`, ustawienie `userId` i `supabase`, przekierowania dla ścieżek chronionych i auth |
| Typy | `src/env.d.ts` — bez zmian w Locals (już jest `userId?`); ewentualnie rozszerzenie o `user?: User` z Supabase Auth |
| Istniejące API | Wszystkie pliki w `src/pages/api/` korzystające z użytkownika — źródło `userId`: `context.locals.userId` zamiast `DEFAULT_USER_ID` |

Po wdrożeniu tej specyfikacji moduł rejestracji, logowania, odzyskiwania hasła, zmiany hasła i usuwania konta będzie zgodny z US-005 i US-006 oraz ze stackiem Astro, React, Supabase i Tailwind/Shadcn bez naruszania działania obecnej aplikacji.
