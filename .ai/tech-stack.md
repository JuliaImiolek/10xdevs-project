Frontend - Astro z React dla komponentów interaktywnych:
- Astro 5 pozwala na tworzenie szybkich, wydajnych stron i aplikacji z minimalną ilością JavaScript
- React 19 zapewni interaktywność tam, gdzie jest potrzebna
- TypeScript 5 dla statycznego typowania kodu i lepszego wsparcia IDE
- Tailwind 4 pozwala na wygodne stylowanie aplikacji
- Shadcn/ui zapewnia bibliotekę dostępnych komponentów React, na których oprzemy UI

Backend - Supabase jako kompleksowe rozwiązanie backendowe:
- Zapewnia bazę danych PostgreSQL
- Zapewnia SDK w wielu językach, które posłużą jako Backend-as-a-Service
- Jest rozwiązaniem open source, które można hostować lokalnie lub na własnym serwerze
- Posiada wbudowaną autentykację użytkowników

AI - Komunikacja z modelami przez usługę Openrouter.ai:
- Dostęp do szerokiej gamy modeli (OpenAI, Anthropic, Google i wiele innych), które pozwolą nam znaleźć rozwiązanie zapewniające wysoką efektywność i niskie koszta
- Pozwala na ustawianie limitów finansowych na klucze API

CI/CD i Hosting:
- Github Actions do tworzenia pipeline’ów CI/CD
- DigitalOcean do hostowania aplikacji za pośrednictwem obrazu dockerFrontend - Astro z React dla komponentów interaktywnych:
- Astro 5 pozwala na tworzenie szybkich, wydajnych stron i aplikacji z minimalną ilością JavaScript
- React 19 zapewni interaktywność tam, gdzie jest potrzebna
- TypeScript 5 dla statycznego typowania kodu i lepszego wsparcia IDE
- Tailwind 4 pozwala na wygodne stylowanie aplikacji
- Shadcn/ui zapewnia bibliotekę dostępnych komponentów React, na których oprzemy UI

Backend - Supabase jako kompleksowe rozwiązanie backendowe:
- Zapewnia bazę danych PostgreSQL
- Zapewnia SDK w wielu językach, które posłużą jako Backend-as-a-Service
- Jest rozwiązaniem open source, które można hostować lokalnie lub na własnym serwerze
- Posiada wbudowaną autentykację użytkowników

AI - Komunikacja z modelami przez usługę Openrouter.ai:
- Dostęp do szerokiej gamy modeli (OpenAI, Anthropic, Google i wiele innych), które pozwolą nam znaleźć rozwiązanie zapewniające wysoką efektywność i niskie koszta
- Pozwala na ustawianie limitów finansowych na klucze API

Testy jednostkowe:
- Vitest — testy jednostkowe TypeScript i React; dobra integracja z Vite/Astro, ESM, szybkie uruchomienie
- React Testing Library — testy komponentów React (zachowanie i dostępność, bez uzależnienia od szczegółów implementacji)
- Mock HTTP/API: Vitest (`vi.fn()`, `vi.mock`) lub opcjonalnie MSW (Mock Service Worker) — mock `fetch` w hookach i komponentach, mock OpenRouter w serwisach
- Testy integracyjne API: Vitest lub Node + `undici`/`fetch` — wywołanie endpointów Astro; mock Supabase lub testowa baza
- Pokrycie kodu: Vitest `--coverage` (v8/istanbul) — raport dla `src/lib`, `src/components`, `src/pages/api`

Testy E2E:
- Playwright — testy end-to-end w przeglądarce; obsługa wielu przeglądarek, trwałe sesje, cookies; dopasowanie do Astro SSR (przepływy użytkownika: auth, generowanie fiszek, lista, sesja powtórek)