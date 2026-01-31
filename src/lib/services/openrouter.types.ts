// src/lib/services/openrouter.types.ts
// Typy dla komunikacji z OpenRouter API (Chat Completions).

// ------------------------------------------------------------------------------------------------
// Komunikat w tablicy messages
// ------------------------------------------------------------------------------------------------
export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// ------------------------------------------------------------------------------------------------
// response_format w body żądania
// ------------------------------------------------------------------------------------------------
export type OpenRouterResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | {
      type: "json_schema";
      json_schema: {
        name: string;
        strict: boolean;
        schema: object;
      };
    };

// ------------------------------------------------------------------------------------------------
// Opcjonalne parametry modelu przekazywane 1:1 do body
// ------------------------------------------------------------------------------------------------
export interface OpenRouterModelParams {
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  seed?: number;
}

// ------------------------------------------------------------------------------------------------
// Request body (POST .../chat/completions)
// ------------------------------------------------------------------------------------------------
export interface OpenRouterChatRequestBody {
  messages: OpenRouterMessage[];
  model?: string;
  response_format?: OpenRouterResponseFormat;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  seed?: number;
}

// ------------------------------------------------------------------------------------------------
// Odpowiedź sukces (200)
// ------------------------------------------------------------------------------------------------
export interface OpenRouterChoice {
  message: {
    role: string;
    content: string | null;
  };
  finish_reason?: string;
}

export interface OpenRouterUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface OpenRouterSuccessResponse {
  id?: string;
  choices: OpenRouterChoice[];
  usage?: OpenRouterUsage;
  model?: string;
}

// ------------------------------------------------------------------------------------------------
// Odpowiedź błędu (4xx/5xx) — struktura OpenRouter
// ------------------------------------------------------------------------------------------------
export interface OpenRouterErrorResponse {
  error: {
    code: number;
    message: string;
    metadata?: object;
  };
}

// ------------------------------------------------------------------------------------------------
// Zunifikowany wynik metody chat()
// ------------------------------------------------------------------------------------------------
export interface OpenRouterChatSuccess {
  success: true;
  content: string;
  usage?: OpenRouterUsage;
  model?: string;
}

export interface OpenRouterChatError {
  success: false;
  errorCode: number | string;
  errorMessage: string;
}

export type OpenRouterChatResult = OpenRouterChatSuccess | OpenRouterChatError;

// ------------------------------------------------------------------------------------------------
// Zunifikowany wynik metody chatWithStructuredOutput<T>()
// ------------------------------------------------------------------------------------------------
export interface OpenRouterStructuredSuccess<T> {
  success: true;
  data: T;
}

export interface OpenRouterStructuredError {
  success: false;
  errorCode: number | string;
  errorMessage: string;
  rawContent?: string;
}

export type OpenRouterStructuredResult<T> =
  | OpenRouterStructuredSuccess<T>
  | OpenRouterStructuredError;

// ------------------------------------------------------------------------------------------------
// Opcje wywołania chat() / chatWithStructuredOutput()
// ------------------------------------------------------------------------------------------------
export interface OpenRouterChatOptions extends OpenRouterModelParams {
  systemMessage?: string;
  userMessage?: string;
  messages?: OpenRouterMessage[];
  model?: string;
  responseFormat?: OpenRouterResponseFormat;
}
