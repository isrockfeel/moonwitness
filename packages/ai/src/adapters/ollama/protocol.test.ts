/**
 * Ollama Protocol Validation Tests
 *
 * These tests validate real Ollama API behavior against our provider-neutral contracts.
 * They are SKIPPED in normal CI and only run when OLLAMA_BASE_URL is explicitly set.
 *
 * Run with: OLLAMA_BASE_URL=http://localhost:11434 pnpm test
 */

import { describe, it, expect, beforeAll } from "vitest";

import { createProviderError, isCancellationError } from "../../errors";
import { ChatRequestSchema, StreamingEventSchema, ModelIdentitySchema } from "../../schemas";
import { OllamaAdapter } from "../ollama";

// Skip all tests if no Ollama endpoint configured
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL;
const skipIfNoOllama = OLLAMA_BASE_URL ? describe : describe.skip;

skipIfNoOllama("Ollama Protocol Validation (opt-in)", () => {
  let adapter: OllamaAdapter;

  beforeAll(() => {
    adapter = new OllamaAdapter({
      baseUrl: OLLAMA_BASE_URL!,
      timeoutMs: 60000,
    });
  });

  describe("Health Check & Model Listing", () => {
    it("should respond to /api/tags (model listing)", async () => {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data).toHaveProperty("models");
      expect(Array.isArray(data.models)).toBe(true);

      // Validate each model against our schema
      for (const model of data.models) {
        expect(() => ModelIdentitySchema.parse(model)).not.toThrow();
      }
    });

    it("should report healthy status", async () => {
      const health = await adapter.checkHealth();
      expect(health.provider).toBe("ollama");
      expect(["healthy", "degraded", "unhealthy", "unknown"]).toContain(health.status);
      expect(typeof health.lastCheckAt).toBe("number");
      expect(typeof health.latencyMs).toBe("number");
    });
  });

  describe("Chat Completion (/api/chat)", () => {
    it("should accept basic chat request", async () => {
      const request = {
        model: "llama3.1:8b", // Common test model
        messages: [{ role: "user", content: "Say hello in one word" }],
        stream: false,
        options: { temperature: 0.1 },
      };

      const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      expect(response.ok).toBe(true);

      const data = await response.json();
      // Validate response structure
      expect(data).toHaveProperty("model");
      expect(data).toHaveProperty("message");
      expect(data.message).toHaveProperty("role", "assistant");
      expect(data.message).toHaveProperty("content");
      expect(typeof data.message.content).toBe("string");
      expect(data.message.content.length).toBeGreaterThan(0);
      expect(data).toHaveProperty("done", true);
      // Usage fields (may be null/absent)
      expect(data).toHaveProperty("prompt_eval_count");
      expect(data).toHaveProperty("eval_count");
    });

    it("should handle model_not_found error", async () => {
      const request = {
        model: "nonexistent-model-xyz",
        messages: [{ role: "user", content: "test" }],
        stream: false,
      };

      const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data).toHaveProperty("error");
      expect(data.error).toContain("not found");

      const error = createProviderError(data, "ollama", { modelId: "nonexistent-model-xyz" });
      expect(error.code).toBe("MODEL_NOT_FOUND");
      expect(error.retryable).toBe(false);
    });

    it("should validate request schema", () => {
      const validRequest = {
        requestId: "test-1",
        model: "llama3.1:8b",
        messages: [{ role: "user", content: "Hello" }],
        temperature: 0.7,
        maxTokens: 100,
      };

      expect(() => ChatRequestSchema.parse(validRequest)).not.toThrow();
    });

    it("should reject invalid request (missing model)", () => {
      const invalidRequest = {
        requestId: "test-1",
        messages: [{ role: "user", content: "Hello" }],
      };

      expect(() => ChatRequestSchema.parse(invalidRequest)).toThrow();
    });
  });

  describe("SSE Streaming (/api/chat with stream=true)", () => {
    it("should stream content deltas", async () => {
      const request = {
        model: "llama3.1:8b",
        messages: [{ role: "user", content: "Count to 3" }],
        stream: true,
        options: { temperature: 0.1 },
      };

      const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      expect(response.ok).toBe(true);
      expect(response.headers.get("content-type")).toContain("application/x-ndjson");

      const reader = response.body?.getReader();
      expect(reader).toBeDefined();

      let chunkCount = 0;
      let doneReceived = false;
      let fullContent = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = new TextDecoder().decode(value);
        const lines = text.trim().split("\n");

        for (const line of lines) {
          if (!line) continue;
          chunkCount++;

          const chunk = JSON.parse(line);
          // Validate streaming event schema
          expect(() =>
            StreamingEventSchema.parse({ type: "content", delta: chunk, requestId: "test" }),
          ).not.toThrow();

          if (chunk.message?.content) {
            fullContent += chunk.message.content;
          }
          if (chunk.done === true) {
            doneReceived = true;
            // Final chunk should have usage info
            expect(chunk).toHaveProperty("prompt_eval_count");
            expect(chunk).toHaveProperty("eval_count");
          }
        }
      }

      expect(chunkCount).toBeGreaterThan(1);
      expect(doneReceived).toBe(true);
      expect(fullContent.length).toBeGreaterThan(0);
    });

    it("should support cancellation via abort signal", async () => {
      const controller = new AbortController();
      // Abort immediately
      controller.abort();

      const request = {
        model: "llama3.1:8b",
        messages: [{ role: "user", content: "Write a very long story..." }],
        stream: true,
      };

      await expect(
        fetch(`${OLLAMA_BASE_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
          signal: controller.signal,
        }),
      ).rejects.toThrow();
    });
  });

  describe("Tool Calls", () => {
    it("should report tool calling capability", () => {
      const caps = adapter.capabilities;
      // Document current capability - update after verification
      expect(typeof caps.tools).toBe("boolean");
    });

    it("should handle tool call request format", async () => {
      // This documents expected behavior; actual support TBD
      const request = {
        model: "llama3.1:8b",
        messages: [{ role: "user", content: "What's the weather?" }],
        stream: false,
        tools: [
          {
            type: "function",
            function: {
              name: "get_weather",
              description: "Get weather for a location",
              parameters: {
                type: "object",
                properties: {
                  location: { type: "string" },
                },
                required: ["location"],
              },
            },
          },
        ],
      };

      const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      // Document behavior - may be 400 if unsupported
      console.log("Tool call response status:", response.status);
      const data = await response.json();
      console.log("Tool call response:", JSON.stringify(data, null, 2));
    });
  });

  describe("Structured Output / JSON Mode", () => {
    it("should handle format=json request", async () => {
      const request = {
        model: "llama3.1:8b",
        messages: [{ role: "user", content: 'Output JSON: {"name": "test"}' }],
        stream: false,
        format: "json",
      };

      const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      console.log("JSON format response status:", response.status);
      const data = await response.json();
      console.log("JSON format response:", JSON.stringify(data, null, 2));
    });
  });

  describe("Usage Metadata", () => {
    it("should provide token counts in non-streaming response", async () => {
      const request = {
        model: "llama3.1:8b",
        messages: [{ role: "user", content: "Hi" }],
        stream: false,
      };

      const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      const data = await response.json();
      expect(data).toHaveProperty("prompt_eval_count");
      expect(data).toHaveProperty("eval_count");
      expect(typeof data.prompt_eval_count).toBe("number");
      expect(typeof data.eval_count).toBe("number");
      expect(data.prompt_eval_count).toBeGreaterThanOrEqual(0);
      expect(data.eval_count).toBeGreaterThanOrEqual(0);
    });

    it("should provide token counts in final streaming chunk", async () => {
      const request = {
        model: "llama3.1:8b",
        messages: [{ role: "user", content: "Hi" }],
        stream: true,
      };

      const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      const reader = response.body!.getReader();
      let finalChunk: unknown = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = new TextDecoder().decode(value);
        const lines = text.trim().split("\n");
        for (const line of lines) {
          if (line) finalChunk = JSON.parse(line);
        }
      }

      expect(finalChunk).not.toBeNull();
      expect(finalChunk).toHaveProperty("prompt_eval_count");
      expect(finalChunk).toHaveProperty("eval_count");
    });
  });

  describe("Model Listing Format", () => {
    it("should return models with expected fields", async () => {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
      const data = await response.json();

      expect(data.models).toBeDefined();
      if (data.models.length > 0) {
        const model = data.models[0];
        expect(model).toHaveProperty("name");
        expect(model).toHaveProperty("size");
        expect(model).toHaveProperty("digest");
        expect(model).toHaveProperty("details");
        expect(model.details).toHaveProperty("format");
        expect(model.details).toHaveProperty("family");
        expect(model.details).toHaveProperty("parameter_size");
        expect(model.details).toHaveProperty("quantization_level");
      }
    });
  });

  describe("OpenAI-Compatible Endpoint (/v1/chat/completions)", () => {
    it("should accept OpenAI-format request", async () => {
      const request = {
        model: "llama3.1:8b",
        messages: [{ role: "user", content: "Hello" }],
        stream: false,
        temperature: 0.1,
      };

      const response = await fetch(`${OLLAMA_BASE_URL}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      console.log("OpenAI-compat status:", response.status);
      if (response.ok) {
        const data = await response.json();
        console.log("OpenAI-compat response:", JSON.stringify(data, null, 2));
        expect(data).toHaveProperty("choices");
        expect(data.choices[0]).toHaveProperty("message");
        expect(data.choices[0].message).toHaveProperty("content");
        expect(data).toHaveProperty("usage");
      }
    });
  });
});

// Additional test: Error normalization
describe("Error Normalization (unit tests)", () => {
  it("should normalize MODEL_NOT_FOUND", () => {
    const error = createProviderError({ error: "model 'xyz' not found" }, "ollama", {
      modelId: "xyz",
    });
    expect(error.code).toBe("MODEL_NOT_FOUND");
    expect(error.retryable).toBe(false);
  });

  it("should normalize RATE_LIMITED", () => {
    const error = createProviderError({ error: "rate limit exceeded" }, "ollama");
    expect(error.code).toBe("RATE_LIMITED");
    expect(error.retryable).toBe(true);
  });

  it("should normalize TIMEOUT", () => {
    const error = createProviderError(new Error("request timed out"), "ollama", {
      timeoutMs: 5000,
    });
    expect(error.code).toBe("TIMEOUT");
    expect(error.retryable).toBe(true);
  });

  it("should normalize CANCELLED", () => {
    const error = createProviderError(new DOMException("Aborted", "AbortError"), "ollama");
    expect(error.code).toBe("CANCELLED");
    expect(isCancellationError(error)).toBe(true);
  });

  it("should normalize CONTEXT_LENGTH_EXCEEDED", () => {
    const error = createProviderError({ error: "context length exceeded" }, "ollama");
    expect(error.code).toBe("CONTEXT_LENGTH_EXCEEDED");
    expect(error.retryable).toBe(false);
  });
});
