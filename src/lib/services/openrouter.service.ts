// src/lib/services/openrouter.service.ts
// Warstwa aplikacyjna do komunikacji z OpenRouter API (chat/completions).

import type {
  OpenRouterChatOptions,
  OpenRouterChatRequestBody,
  OpenRouterChatResult,
  OpenRouterErrorResponse,
  OpenRouterMessage,
  OpenRouterModelParams,
  OpenRouterResponseFormat,
  OpenRouterStructuredResult,
  OpenRouterSuccessResponse,
  OpenRouterUsage,
} from "./openrouter.types";

// ------------------------------------------------------------------------------------------------
// Stałe
// ------------------------------------------------------------------------------------------------
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "openai/gpt-oss-120b:free";
/** 2 minutes — free/slow models can take a long time to respond */
const DEFAULT_REQUEST_TIMEOUT_MS = 120_000;
const RAW_CONTENT_TRUNCATE_LENGTH = 200;
const ERROR_MESSAGE_NO_API_KEY = "OpenRouter API key is not configured";
const ERROR_MESSAGE_NO_CONTENT = "No content generated";
const ERROR_MESSAGE_NETWORK = "Network error";
const ERROR_MESSAGE_TIMEOUT = "Request timeout";

/** Wynik wewnętrzny parseResponse (sukces lub błąd). */
type ParseSuccess = {
  ok: true;
  content: string;
  usage?: OpenRouterUsage;
  model?: string;
};
type ParseError = {
  ok: false;
  errorCode: number | string;
  errorMessage: string;
};
type ParseResult = ParseSuccess | ParseError;

// ------------------------------------------------------------------------------------------------
// Konfiguracja (opcjonalna — dla testów i różnych środowisk)
// ------------------------------------------------------------------------------------------------
export interface OpenRouterServiceConfig {
  baseUrl?: string;
  apiKey?: string;
  defaultModel?: string;
  requestTimeoutMs?: number;
}

// ------------------------------------------------------------------------------------------------
// OpenRouterService
// ------------------------------------------------------------------------------------------------
export class OpenRouterService {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly defaultModel: string;
  private readonly requestTimeoutMs: number;

  constructor(options?: OpenRouterServiceConfig) {
    this.baseUrl =
      options?.baseUrl ?? OPENROUTER_BASE_URL;
    this.apiKey =
      options?.apiKey ??
      (import.meta.env?.OPENROUTER_API_KEY as string | undefined) ??
      (typeof process !== "undefined" ? process.env?.OPENROUTER_API_KEY : undefined) ??
      "";
    this.defaultModel =
      options?.defaultModel ?? DEFAULT_MODEL;
    this.requestTimeoutMs =
      options?.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  }

  // ------------------------------------------------------------------------------------------------
  // Prywatne: normalizacja nazwy modelu
  // ------------------------------------------------------------------------------------------------
  private normalizeModelName(model?: string): string {
    return model ?? this.defaultModel;
  }

  // ------------------------------------------------------------------------------------------------
  // Prywatne: budowanie tablicy messages
  // System na początku (jeśli podany), potem messages lub [user].
  // ------------------------------------------------------------------------------------------------
  private buildMessages(
    systemMessage?: string,
    userMessage?: string,
    messages?: OpenRouterMessage[]
  ): OpenRouterMessage[] {
    const hasSystem = systemMessage != null && systemMessage.trim() !== "";
    const systemPart: OpenRouterMessage[] = hasSystem
      ? [{ role: "system", content: systemMessage!.trim() }]
      : [];

    if (messages != null && messages.length > 0) {
      return [...systemPart, ...messages];
    }

    if (userMessage == null || userMessage.trim() === "") {
      return systemPart.length > 0 ? systemPart : [];
    }

    return [
      ...systemPart,
      { role: "user", content: userMessage.trim() },
    ];
  }

  // ------------------------------------------------------------------------------------------------
  // Prywatne: budowanie body żądania (bez pól undefined)
  // ------------------------------------------------------------------------------------------------
  private buildBody(
    messages: OpenRouterMessage[],
    model: string,
    responseFormat?: OpenRouterResponseFormat,
    params?: OpenRouterModelParams
  ): OpenRouterChatRequestBody {
    const body: OpenRouterChatRequestBody = {
      messages,
      model: this.normalizeModelName(model),
    };

    if (responseFormat != null) {
      body.response_format = responseFormat;
    }

    if (params?.max_tokens != null) body.max_tokens = params.max_tokens;
    if (params?.temperature != null) body.temperature = params.temperature;
    if (params?.top_p != null) body.top_p = params.top_p;
    if (params?.frequency_penalty != null)
      body.frequency_penalty = params.frequency_penalty;
    if (params?.presence_penalty != null)
      body.presence_penalty = params.presence_penalty;
    if (params?.stop != null) body.stop = params.stop;
    if (params?.seed != null) body.seed = params.seed;

    return body;
  }

  // ------------------------------------------------------------------------------------------------
  // Prywatne: wysyłanie żądania POST (timeout przez AbortController)
  // ------------------------------------------------------------------------------------------------
  private async sendRequest(body: OpenRouterChatRequestBody): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      return response;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(ERROR_MESSAGE_TIMEOUT);
      }
      const detail =
        err instanceof Error
          ? err.cause instanceof Error
            ? err.cause.message
            : err.message
          : String(err);
      const message =
        detail && detail !== ERROR_MESSAGE_NETWORK
          ? `${ERROR_MESSAGE_NETWORK}: ${detail}`
          : ERROR_MESSAGE_NETWORK;
      throw new Error(message);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ------------------------------------------------------------------------------------------------
  // Prywatne: parsowanie odpowiedzi (sukces → content/usage/model; błąd HTTP → errorCode/errorMessage)
  // ------------------------------------------------------------------------------------------------
  private async parseResponse(response: Response): Promise<ParseResult> {
    if (!response.ok) {
      let errorCode: number = response.status;
      let errorMessage = response.statusText;
      try {
        const data = (await response.json()) as OpenRouterErrorResponse;
        if (data?.error?.code != null) errorCode = data.error.code;
        if (data?.error?.message != null) errorMessage = data.error.message;
      } catch {
        // body nie jest JSON — zostaw status i statusText
      }
      return { ok: false, errorCode, errorMessage };
    }

    const data = (await response.json()) as OpenRouterSuccessResponse;
    const content = data.choices?.[0]?.message?.content ?? null;
    if (content == null || (typeof content === "string" && content.trim() === "")) {
      return {
        ok: false,
        errorCode: "NO_CONTENT",
        errorMessage: ERROR_MESSAGE_NO_CONTENT,
      };
    }

    return {
      ok: true,
      content: typeof content === "string" ? content : String(content),
      usage: data.usage,
      model: data.model,
    };
  }

  // ------------------------------------------------------------------------------------------------
  // Publiczne: chat — zunifikowany wynik success/content lub error/errorCode/errorMessage
  // ------------------------------------------------------------------------------------------------
  async chat(options: OpenRouterChatOptions): Promise<OpenRouterChatResult> {
    if (!this.apiKey || this.apiKey.trim() === "") {
      return {
        success: false,
        errorCode: "NO_API_KEY",
        errorMessage: ERROR_MESSAGE_NO_API_KEY,
      };
    }

    const messages = this.buildMessages(
      options.systemMessage,
      options.userMessage,
      options.messages
    );
    if (messages.length === 0) {
      return {
        success: false,
        errorCode: "INVALID_INPUT",
        errorMessage: "At least one message (system, user, or messages) is required",
      };
    }

    const params: OpenRouterModelParams = {
      max_tokens: options.max_tokens,
      temperature: options.temperature,
      top_p: options.top_p,
      frequency_penalty: options.frequency_penalty,
      presence_penalty: options.presence_penalty,
      stop: options.stop,
      seed: options.seed,
    };
    const body = this.buildBody(
      messages,
      options.model ?? this.defaultModel,
      options.responseFormat,
      params
    );

    let response: Response;
    try {
      response = await this.sendRequest(body);
    } catch (err) {
      const message = err instanceof Error ? err.message : ERROR_MESSAGE_NETWORK;
      const isTimeout = message === ERROR_MESSAGE_TIMEOUT;
      return {
        success: false,
        errorCode: isTimeout ? 408 : "NETWORK_ERROR",
        errorMessage: message,
      };
    }

    const parsed = await this.parseResponse(response);
    if (!parsed.ok) {
      return {
        success: false,
        errorCode: parsed.errorCode,
        errorMessage: parsed.errorMessage,
      };
    }

    return {
      success: true,
      content: parsed.content,
      usage: parsed.usage,
      model: parsed.model,
    };
  }

  // ------------------------------------------------------------------------------------------------
  // Publiczne: chatWithStructuredOutput — wywołuje chat(), parsuje JSON, zwraca T lub błąd
  // ------------------------------------------------------------------------------------------------
  async chatWithStructuredOutput<T>(
    options: OpenRouterChatOptions & { responseFormat: OpenRouterResponseFormat }
  ): Promise<OpenRouterStructuredResult<T>> {
    const result = await this.chat(options);
    if (!result.success) {
      return {
        success: false,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
      };
    }

    try {
      const data = JSON.parse(result.content) as T;
      return { success: true, data };
    } catch {
      const rawContent =
        result.content.length > RAW_CONTENT_TRUNCATE_LENGTH
          ? `${result.content.slice(0, RAW_CONTENT_TRUNCATE_LENGTH)}…`
          : result.content;
      return {
        success: false,
        errorCode: "PARSE_ERROR",
        errorMessage: "Invalid JSON in model response",
        rawContent,
      };
    }
  }
}
