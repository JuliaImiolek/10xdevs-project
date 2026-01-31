# Plan wdrożenia usługi OpenRouter

Przewodnik implementacji usługi współpracującej z API OpenRouter do uzupełnienia czatów opartych na LLM w projekcie (Astro 5, TypeScript 5, Supabase). Usługa ma być umieszczona w `src/lib/services/` i wykorzystywana m.in. przez `generation.service.ts` do generowania fiszek.

---

## 1. Opis usługi

**OpenRouterService** — warstwa aplikacyjna do komunikacji z `https://openrouter.ai/api/v1/chat/completions`. Jej zadania:

- Budowanie i wysyłanie żądań w formacie OpenAI Chat Completions (messages, model, parametry).
- Obsługa **komunikatu systemowego**, **komunikatu użytkownika**, **response_format** (np. JSON Schema), **nazwy modelu** i **parametrów modelu**.
- Parsowanie odpowiedzi i wyciąganie treści (tekst lub zdekodowany JSON przy structured output).
- Centralna obsługa błędów HTTP i błędów zwracanych przez OpenRouter (`error.code`, `error.message`, `error.metadata`).
- Nie loguje ani nie przechowuje klucza API poza konfiguracją; klucz pobierany z zmiennej środowiskowej.

Usługa jest **synchroniczna z punktu widzenia wywołującego** (async/await); streaming może być rozważony w osobnej metodzie w przyszłości.

---

## 2. Opis konstruktora

Konstruktor przyjmuje **opcjonalną konfigurację**, aby umożliwić testy z mockiem i różne środowiska.

- **baseUrl** (opcjonalny) — np. `https://openrouter.ai/api/v1`; domyślnie stała w kodzie.
- **apiKey** (opcjonalny) — klucz API; domyślnie `import.meta.env.OPENROUTER_API_KEY`.
- **defaultModel** (opcjonalny) — domyślna nazwa modelu, np. `openrouter/default` lub `anthropic/claude-3-haiku`, używana gdy wywołanie nie poda modelu.
- **requestTimeoutMs** (opcjonalny) — timeout żądania HTTP w ms; rozsądna wartość domyślna np. 60000.

**Zasady:**

- Jeśli `apiKey` jest puste (nie przekazane i nie ustawione w env), usługa może rzucić przy pierwszym wywołaniu metody chat (albo w konstruktorze — do ustalenia w kroku wdrożenia) z czytelnym komunikatem, że brakuje klucza.
- Konstruktor nie wykonuje żadnych wywołań sieciowych; tylko przypisuje konfigurację do pól (readonly).

---

## 3. Publiczne metody i pola

### 3.1 Metody

| Metoda | Opis |
|--------|------|
| **chat(options)** | Główna metoda: buduje `messages`, body (model, parametry, response_format), wysyła `POST .../chat/completions`, parsuje odpowiedź. Zwraca wynik typu zunifikowanego (success + content/structuredData lub error + code/message). |
| **chatWithStructuredOutput\<T\>(options)** | Wariant: przyjmuje `response_format` w formacie `{ type: 'json_schema', json_schema: { name, strict: true, schema } }`, po odpowiedzi parsuje `content` jako JSON i zwraca ztypizowany obiekt `T` lub błąd (w tym błąd parsowania JSON). |

### 3.2 Opcje wejściowe (chat)

- **systemMessage** (opcjonalny) — komunikat z rolą `system`; dodawany jako pierwszy element `messages`.
- **userMessage** (wymagany dla prostego czatu) — komunikat z rolą `user`; treść użytkownika.
- **messages** (opcjonalny) — pełna tablica `{ role, content }`; jeśli podana, może być używana zamiast system + user (szczegóły w kroku wdrożenia: czy nadpisywać, czy łączyć).
- **model** (opcjonalny) — nazwa modelu; brak → `defaultModel` z konfiguracji.
- **responseFormat** (opcjonalny) — np. `{ type: 'text' }`, `{ type: 'json_object' }` lub `{ type: 'json_schema', json_schema: { name, strict, schema } }`.
- **max_tokens**, **temperature**, **top_p**, **frequency_penalty**, **presence_penalty**, **stop**, **seed** — opcjonalne parametry modelu przekazywane 1:1 do body.

### 3.3 Pola (readonly, ustawiane w konstruktorze)

- **baseUrl**, **apiKey**, **defaultModel**, **requestTimeoutMs** — do użycia wewnętrznie i w testach.

---

## 4. Prywatne metody i pola

- **buildMessages(systemMessage?, userMessage?, messages?)** — zwraca tablicę `messages` w formacie OpenRouter: ewentualny `{ role: 'system', content }`, potem albo przekazane `messages`, albo `{ role: 'user', content: userMessage }`. Jedna, spójna logika budowania (np. zawsze system na początku, jeśli podany).
- **buildBody(messages, model, responseFormat?, params)** — zwraca obiekt body: `messages`, `model`, oraz opcjonalnie `response_format`, `max_tokens`, `temperature`, itd. Nie dodaje pól ustawionych na `undefined`.
- **sendRequest(body)** — wykonuje `fetch(baseUrl + '/chat/completions', { method: 'POST', headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })` z obsługą `requestTimeoutMs` (AbortController). Zwraca surową odpowiedź (Response).
- **parseResponse(response)** — czyta `response.json()`. Jeśli HTTP nie OK, rzuca lub zwraca błąd z `error.code` i `error.message` z body (wg dokumentacji OpenRouter). Jeśli OK, zwraca obiekt z `choices[0].message.content` oraz ewentualnie `usage`, `model`.
- **normalizeModelName(model?)** — zwraca `model ?? defaultModel`; ewentualna walidacja/normalizacja (np. lista dozwolonych modeli) — opcjonalnie.

Pola prywatne: przechowanie `baseUrl`, `apiKey`, `defaultModel`, `requestTimeoutMs` (jeśli klasa); w wersji funkcyjnej — te same wartości w closure.

---

## 5. Obsługa błędów

- **Brak klucza API** — przed wysłaniem żądania: jeśli brak `apiKey`, zwrócić/zrzucić błąd z czytelnym komunikatem (np. "OpenRouter API key is not configured").
- **HTTP 4xx/5xx** — traktować odpowiedź jako ErrorResponse OpenRouter: `{ error: { code, message, metadata? } }`. Mapować `error.code` (np. 400, 401, 402, 403, 408, 429, 502, 503) na typ błędu w aplikacji; `error.message` przekazać do logów i ewentualnie do użytkownika (ograniczone szczegóły).
- **Timeout** — przy AbortController timeout zwrócić błąd typu timeout (np. odpowiednik 408).
- **Sieć (fetch throws)** — łapać wyjątek, logować, zwrócić błąd generyczny (np. "Network error") bez eksponowania wewnętrznych szczegółów.
- **Odpowiedź 200 z pustym content** — gdy `choices[0].message.content` brak lub pusty, traktować jako błąd "No content generated" (zgodnie z dokumentacją OpenRouter: cold start, skaling); opcjonalnie retry w warstwie wyżej.
- **Structured output: nieprawidłowy JSON** — w `chatWithStructuredOutput` przy `JSON.parse` catch zwrócić błąd parsowania z fragmentem treści (np. pierwsze 200 znaków) do logów.
- **Rate limit (429)** — zwrócić błąd z kodem 429 i komunikatem; warstwa wyżej może zaimplementować retry z backoff.

Wszystkie błędy zwracane jako wynik (np. `{ success: false, errorCode, errorMessage }`) lub rzucane jako typy aplikacyjne — spójnie z resztą projektu (np. generation.service).

---

## 6. Kwestie bezpieczeństwa

- **Klucz API** — używany wyłącznie po stronie serwera (w usłudze wywoływanej z API routes Astro). Nigdy nie wysyłany do klienta ani nie logowany. Pobieranie z `import.meta.env.OPENROUTER_API_KEY` (lub z opcji konstruktora w testach).
- **Treści użytkownika** — przekazywane do OpenRouter zgodnie z polityką prywatności OpenRouter; nie przechowywać pełnych promptów w logach produkcyjnych (opcjonalnie tylko hash lub długość).
- **Walidacja wejścia** — długość `userMessage` / `systemMessage` może być ograniczona w warstwie wywołującej (np. generation.service); w samej usłudze OpenRouter można dodać rozsądne limity (np. max znaków), aby uniknąć nadmiernego zużycia tokenów.
- **Timeout** — zawsze ustawiony, aby uniknąć wiszących żądań.
- **Błędy** — w odpowiedziach do klienta nie ujawniać szczegółów wewnętrznych (np. stack trace, surowy message od providera); tylko ogólny typ błędu i bezpieczny komunikat.

---

## 7. Plan wdrożenia krok po kroku

### Krok 1: Środowisko i typy

- Upewnić się, że w `src/env.d.ts` istnieje `OPENROUTER_API_KEY` w `ImportMetaEnv` (już jest).
- Dodać plik `src/lib/services/openrouter.types.ts` (lub odpowiedni moduł typów w `src/types.ts`):
  - Typy dla **komunikatu**: `{ role: 'system' | 'user' | 'assistant'; content: string }`.
  - **Request body**: `messages`, `model?`, `response_format?`, `max_tokens?`, `temperature?`, `top_p?`, `frequency_penalty?`, `presence_penalty?`, `stop?`, `seed?`.
  - **response_format**:  
    - `{ type: 'text' }` | `{ type: 'json_object' }` |  
    - `{ type: 'json_schema'; json_schema: { name: string; strict: boolean; schema: object } }`.
  - **Odpowiedź sukces**: `id`, `choices: [{ message: { role, content }, finish_reason }]`, `usage?`, `model?`.
  - **Odpowiedź błędu**: `{ error: { code: number; message: string; metadata?: object } }`.

### Krok 2: Konfiguracja i konstruktor

- Utworzyć `src/lib/services/openrouter.service.ts`.
- Zdefiniować stałe: `OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'`, domyślny model np. `openrouter/default`.
- Zdefiniować interfejs konfiguracji: `baseUrl?`, `apiKey?`, `defaultModel?`, `requestTimeoutMs?`.
- W konstruktorze (klasa) lub w fabryce (funkcja) przypisać:  
  `apiKey = options?.apiKey ?? import.meta.env.OPENROUTER_API_KEY`,  
  `baseUrl = options?.baseUrl ?? OPENROUTER_BASE_URL`,  
  `defaultModel = options?.defaultModel ?? DEFAULT_MODEL`,  
  `requestTimeoutMs = options?.requestTimeoutMs ?? 60000`.

### Krok 3: Budowanie wiadomości i body

- Zaimplementować **buildMessages**: jeśli podano `messages`, użyć ich (opcjonalnie: jeśli podano też `systemMessage`, wstawić go na początek). W przeciwnym razie: `[ { role: 'system', content: systemMessage }, { role: 'user', content: userMessage } ]` (system tylko gdy `systemMessage` niepusty).
- Zaimplementować **buildBody**:  
  - `messages` (wymagane), `model: normalizeModelName(model)`.  
  - Dodać `response_format` tylko gdy podany.  
  - Dodać parametry modelu tylko gdy zdefiniowane (np. `max_tokens`, `temperature`, `top_p`, `frequency_penalty`, `presence_penalty`, `stop`, `seed`).

### Krok 4: Wysyłanie żądania i parsowanie odpowiedzi

- **sendRequest(body)**:
  - `AbortController` + `setTimeout` na `requestTimeoutMs`.
  - `fetch(baseUrl + '/chat/completions', { method: 'POST', headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal })`.
  - W przypadku abortu (timeout) zwrócić/reject z błędem timeout.
- **parseResponse(response)**:
  - Jeśli `!response.ok`: odczytać `await response.json()`, wyciągnąć `error.code`, `error.message` (i opcjonalnie `error.metadata`), zwrócić je jako struktura błędu (np. throw lub return result).
  - Jeśli `response.ok`: `const data = await response.json()`, zwrócić `{ content: data.choices?.[0]?.message?.content ?? null, usage: data.usage, model: data.model }`. Gdy brak `content` lub pusty string — zwrócić błąd "No content generated".

### Krok 5: Metoda chat (publiczna)

- Sprawdzenie `apiKey` na początku; jeśli brak — zwrócenie błędu.
- Wywołanie `buildMessages(systemMessage, userMessage, messages)` i `buildBody(messages, model, responseFormat, params)`.
- Wywołanie `sendRequest(body)` → `parseResponse(response)`.
- Zwrócenie zunifikowanego wyniku, np. `{ success: true, content, usage?, model? }` lub `{ success: false, errorCode, errorMessage }`.

### Krok 6: response_format (JSON Schema) i chatWithStructuredOutput

- W **buildBody** upewnić się, że `response_format` jest przekazywany bez zmian do body, np.:
  ```ts
  response_format: {
    type: 'json_schema',
    json_schema: {
      name: 'flashcards',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          flashcards: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                front: { type: 'string' },
                back: { type: 'string' }
              },
              required: ['front', 'back']
            }
          }
        },
        required: ['flashcards']
      }
    }
  }
  ```
- **chatWithStructuredOutput\<T\>(options)**:
  - Przyjmuje te same opcje co `chat`, plus wymagane `responseFormat` w formacie `json_schema` (lub przyjmuje gotowy schemat w opcjach).
  - Wywołuje wewnętrznie `chat(...)`.
  - Przy sukcesie: `JSON.parse(content)` i zwraca `{ success: true, data: parsed as T }`.
  - Przy błędzie parsowania: zwraca `{ success: false, errorCode: 'PARSE_ERROR', errorMessage, rawContent?: string }` (rawContent obcięty do np. 200 znaków).

### Krok 7: Komunikat systemowy i użytkownika — przykłady

- **Komunikat systemowy** — ustawienie zachowania modelu, np. generowanie fiszek:
  ```ts
  systemMessage: 'You are a helpful assistant that generates flashcards. Output only valid JSON matching the provided schema.'
  ```
- **Komunikat użytkownika** — treść od użytkownika lub z aplikacji:
  ```ts
  userMessage: `Generate up to 5 flashcards from the following text:\n\n${sourceText}`
  ```
- W **buildMessages** pierwszy element to `{ role: 'system', content: systemMessage }` (gdy niepusty), drugi to `{ role: 'user', content: userMessage }` (lub pełna tablica `messages` jeśli używana).

### Krok 8: Nazwa modelu i parametry modelu

- **Model**: przekazywany w opcjach `chat` jako `model`; brak → `defaultModel`. Przykład: `model: 'anthropic/claude-3-haiku'` lub `openrouter/default`.
- **Parametry**: w opcjach przekazać np. `max_tokens: 2048`, `temperature: 0.7`, `top_p: 1`, `frequency_penalty: 0`, `presence_penalty: 0`. W **buildBody** dodać do body tylko te klucze, które są zdefiniowane (nie wysyłać `undefined`).

### Krok 9: Integracja z generation.service

- W `generation.service.ts` zastąpić mock `callAiForFlashcards` wywołaniem OpenRouterService:
  - Utworzyć instancję usługi (np. singleton lub przekazywaną z zewnątrz).
  - Dla generowania fiszek użyć `chatWithStructuredOutput` z:
    - `systemMessage` — instrukcja generowania fiszek i wymóg JSON.
    - `userMessage` — tekst źródłowy (np. `source_text`).
    - `response_format` — schemat JSON z tablicą `flashcards` i polami `front`, `back` (zgodnie z `FlashcardProposalDto`).
  - Mapować wynik usługi na `FlashcardProposalDto[]`; przy błędzie — logować do `generation_error_logs` i zwracać `{ success: false, kind: 'ai_error', ... }` jak dotychczas.

### Krok 10: Obsługa błędów end-to-end

- Dla każdego kodu błędu OpenRouter (400, 401, 402, 403, 408, 429, 502, 503) mapować na jeden typ w aplikacji (np. `OpenRouterError`) z `code` i `message`.
- W generation.service przy 429 rozważyć prosty retry (np. 1–2 ponowienia z opóźnieniem).
- Nie przekazywać do klienta surowych komunikatów z `error.metadata`; logować je po stronie serwera.

---

## Przykłady użycia

### Prosty czat (tekst)

```ts
const service = new OpenRouterService();
const result = await service.chat({
  systemMessage: 'You are a concise assistant.',
  userMessage: 'What is 2+2?',
  model: 'openrouter/default',
  max_tokens: 100
});
// result.success && result.content
```

### Czat ze structured output (fiszki)

```ts
const result = await service.chatWithStructuredOutput<{ flashcards: Array<{ front: string; back: string }> }>({
  systemMessage: 'Generate flashcards in JSON with "front" and "back".',
  userMessage: `Text:\n${sourceText}`,
  model: 'anthropic/claude-3-haiku',
  responseFormat: {
    type: 'json_schema',
    json_schema: {
      name: 'flashcards',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          flashcards: {
            type: 'array',
            items: {
              type: 'object',
              properties: { front: { type: 'string' }, back: { type: 'string' } },
              required: ['front', 'back']
            }
          }
        },
        required: ['flashcards']
      }
    }
  },
  max_tokens: 2048,
  temperature: 0.7
});
```

### Wzór response_format (JSON Schema)

Używać wyłącznie gdy model wspiera structured outputs (dokumentacja OpenRouter):

```ts
response_format: {
  type: 'json_schema',
  json_schema: {
    name: 'schema-name',   // dowolna nazwa, np. 'flashcards'
    strict: true,
    schema: {
      type: 'object',
      properties: { /* ... */ },
      required: [ /* ... */ ]
    }
  }
}
```

---

Koniec przewodnika. Implementacja powinna być spójna z istniejącymi serwisami (`flashcard.service.ts`, `generation.service.ts`) oraz z zasadami z `.cursor/rules/shared.mdc` (wczesne zwroty przy błędach, guard clauses, brak zbędnych else).
