/**
 * Ollama adapter - placeholder for Issue #30 protocol validation.
 * This is a stub that will be implemented based on protocol test findings.
 */

import { createProviderError } from "../../errors";
import type {
  ChatRequest,
  ChatResponse,
  StreamingEvent,
  ModelIdentity,
  ProviderHealth,
  ProviderInfo,
} from "../../types";
import type { ProviderCapabilities } from "../../types";

export interface OllamaAdapterOptions {
  baseUrl: string;
  /** Request timeout in milliseconds. */
  timeoutMs?: number;
  /** Default model to use if not specified. */
  defaultModel?: string;
}

/**
 * Ollama adapter for local inference.
 * Implements the provider-neutral interface defined in @moonwitness/ai.
 */
export class OllamaAdapter {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly defaultModel?: string;

  constructor(options: OllamaAdapterOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.timeoutMs = options.timeoutMs ?? 30000;
    this.defaultModel = options.defaultModel;
  }

  /** Provider identifier. */
  get provider(): string {
    return "ollama";
  }

  /** Provider capabilities. */
  get capabilities(): ProviderCapabilities {
    return {
      chat: true,
      streaming: true,
      tools: false, // TODO: verify via protocol tests
      structuredOutput: false, // TODO: verify via protocol tests
      vision: false, // TODO: verify via protocol tests
      embeddings: true,
      modelListing: true,
      healthCheck: true,
      cancellation: true,
    };
  }

  /** List available models. */
  async listModels(): Promise<ModelIdentity[]> {
    const response = await this.fetchWithTimeout("/api/tags");
    const data = await response.json();

    if (!response.ok) {
      throw createProviderError(data, this.provider);
    }

    // TODO: Map Ollama model format to ModelIdentity
    return [];
  }

  /** Check provider health. */
  async checkHealth(): Promise<ProviderHealth> {
    const start = Date.now();
    try {
      const response = await this.fetchWithTimeout("/api/tags");
      const latencyMs = Date.now() - start;

      if (response.ok) {
        return {
          provider: this.provider,
          status: "healthy",
          lastCheckAt: Date.now(),
          latencyMs,
          models: await this.listModels(),
        };
      }

      return {
        provider: this.provider,
        status: "unhealthy",
        lastCheckAt: Date.now(),
        latencyMs,
        error: `HTTP ${response.status}`,
      };
    } catch (error) {
      return {
        provider: this.provider,
        status: "unhealthy",
        lastCheckAt: Date.now(),
        latencyMs: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /** Get provider info. */
  async getProviderInfo(): Promise<ProviderInfo> {
    return {
      id: this.provider,
      name: "Ollama",
      capabilities: this.capabilities,
      defaultModel: this.defaultModel,
    };
  }

  /** Non-streaming chat completion. */
  async chat(_request: ChatRequest): Promise<ChatResponse> {
    // TODO: Implement based on protocol test findings
    throw new Error("Not implemented - pending protocol validation (Issue #30)");
  }

  /** Streaming chat completion. */
  async *chatStream(_request: ChatRequest): AsyncGenerator<StreamingEvent> {
    // TODO: Implement based on protocol test findings
    throw new Error("Not implemented - pending protocol validation (Issue #30)");
    // Satisfy async generator return type - this line never executes
    // but satisfies the TypeScript async generator return type requirement
    // biome-ignore lint/suspicious/noExplicitAny: satisfies async generator type
    yield undefined as any;
  }

  /** Helper to fetch with timeout and abort support. */
  private async fetchWithTimeout(path: string, init?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        signal: init?.signal ?? controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...init?.headers,
        },
      });
      return response;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new Error("Request timed out");
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
