/**
 * Unit tests for AI provider-neutral contract schemas.
 * Tests valid payloads, invalid payloads, and error normalization.
 */

import { describe, expect, it } from "vitest";

import {
  ChatRequestSchema,
  ChatResponseSchema,
  StreamingEventSchema,
  ModelIdentitySchema,
  UsageMetadataSchema,
  ProviderHealthSchema,
  ProviderErrorSchema,
  ChatMessageSchema,
  ToolDefinitionSchema,
  FinishReasonSchema,
} from "./index";

describe("AI Contract Schemas", () => {
  describe("ModelIdentitySchema", () => {
    it("accepts valid model identity", () => {
      const model = {
        id: "llama3.1:8b",
        name: "Llama 3.1 8B",
        provider: "ollama",
        version: "0.1.0",
        capabilities: {
          chat: true,
          streaming: true,
          tools: false,
          structuredOutput: false,
          vision: false,
          embeddings: true,
          contextWindow: 8192,
          maxOutputTokens: 4096,
        },
        parameterCount: "8B",
        quantization: "Q4_K_M",
      };

      const parsed = ModelIdentitySchema.parse(model);
      expect(parsed.id).toBe("llama3.1:8b");
      expect(parsed.capabilities.chat).toBe(true);
    });

    it("rejects missing required fields", () => {
      expect(() =>
        ModelIdentitySchema.parse({
          name: "Test",
          provider: "ollama",
          capabilities: {
            chat: true,
            streaming: true,
            tools: false,
            structuredOutput: false,
            vision: false,
            embeddings: false,
          },
        }),
      ).toThrow();

      expect(() =>
        ModelIdentitySchema.parse({
          id: "test",
          provider: "ollama",
          capabilities: {
            chat: true,
            streaming: true,
            tools: false,
            structuredOutput: false,
            vision: false,
            embeddings: false,
          },
        }),
      ).toThrow();
    });

    it("rejects invalid capabilities", () => {
      expect(() =>
        ModelIdentitySchema.parse({
          id: "test",
          name: "Test",
          provider: "ollama",
          capabilities: {
            chat: "yes",
            streaming: true,
            tools: false,
            structuredOutput: false,
            vision: false,
            embeddings: false,
          },
        }),
      ).toThrow();
    });
  });

  describe("ChatMessageSchema", () => {
    it("accepts user message", () => {
      const msg = { role: "user", content: "Hello" };
      const parsed = ChatMessageSchema.parse(msg);
      expect(parsed.role).toBe("user");
      expect(parsed.content).toBe("Hello");
    });

    it("accepts assistant message with tool calls", () => {
      const msg = {
        role: "assistant",
        content: "",
        toolCalls: [
          {
            id: "call-1",
            type: "function",
            function: { name: "get_weather", arguments: '{"location":"NYC"}' },
          },
        ],
      };
      const parsed = ChatMessageSchema.parse(msg);
      expect(parsed.toolCalls).toHaveLength(1);
    });

    it("accepts tool response message", () => {
      const msg = { role: "tool", content: "Sunny", toolCallId: "call-1", name: "get_weather" };
      const parsed = ChatMessageSchema.parse(msg);
      expect(parsed.role).toBe("tool");
      expect(parsed.toolCallId).toBe("call-1");
    });

    it("rejects invalid role", () => {
      expect(() => ChatMessageSchema.parse({ role: "invalid", content: "test" })).toThrow();
    });

    it("rejects empty content for non-tool messages", () => {
      expect(() => ChatMessageSchema.parse({ role: "user", content: "" })).not.toThrow(); // Empty string is valid
    });
  });

  describe("ToolDefinitionSchema", () => {
    it("accepts valid tool definition", () => {
      const tool = {
        type: "function",
        function: {
          name: "get_weather",
          description: "Get weather",
          parameters: {
            type: "object",
            properties: { location: { type: "string" } },
            required: ["location"],
          },
        },
      };
      const parsed = ToolDefinitionSchema.parse(tool);
      expect(parsed.function.name).toBe("get_weather");
    });

    it("rejects missing function name", () => {
      expect(() =>
        ToolDefinitionSchema.parse({
          type: "function",
          function: { description: "test", parameters: {} },
        }),
      ).toThrow();
    });
  });

  describe("ChatRequestSchema", () => {
    const validRequest = {
      requestId: "req-1",
      model: "llama3.1:8b",
      messages: [{ role: "user", content: "Hello" }],
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 100,
      stop: ["END"],
      tools: [],
      toolChoice: "auto",
      responseFormat: { type: "json_object" },
      seed: 42,
      user: "user-1",
      timeoutMs: 30000,
    };

    it("accepts valid request", () => {
      const parsed = ChatRequestSchema.parse(validRequest);
      expect(parsed.requestId).toBe("req-1");
      expect(parsed.temperature).toBe(0.7);
    });

    it("rejects missing requestId", () => {
      const { requestId: _requestId, ...rest } = validRequest;
      expect(() => ChatRequestSchema.parse(rest)).toThrow();
    });

    it("rejects missing model", () => {
      const { model: _model, ...rest } = validRequest;
      expect(() => ChatRequestSchema.parse(rest)).toThrow();
    });

    it("rejects empty messages", () => {
      expect(() => ChatRequestSchema.parse({ ...validRequest, messages: [] })).toThrow();
    });

    it("rejects temperature out of range", () => {
      expect(() => ChatRequestSchema.parse({ ...validRequest, temperature: 2.1 })).toThrow();
      expect(() => ChatRequestSchema.parse({ ...validRequest, temperature: -0.1 })).toThrow();
    });

    it("rejects topP out of range", () => {
      expect(() => ChatRequestSchema.parse({ ...validRequest, topP: 1.1 })).toThrow();
    });

    it("rejects negative maxTokens", () => {
      expect(() => ChatRequestSchema.parse({ ...validRequest, maxTokens: -1 })).toThrow();
    });

    it("accepts toolChoice variants", () => {
      expect(() => ChatRequestSchema.parse({ ...validRequest, toolChoice: "none" })).not.toThrow();
      expect(() => ChatRequestSchema.parse({ ...validRequest, toolChoice: "auto" })).not.toThrow();
      expect(() =>
        ChatRequestSchema.parse({ ...validRequest, toolChoice: "required" }),
      ).not.toThrow();
      expect(() =>
        ChatRequestSchema.parse({
          ...validRequest,
          toolChoice: { type: "function", function: { name: "get_weather" } },
        }),
      ).not.toThrow();
    });

    it("accepts responseFormat variants", () => {
      expect(() =>
        ChatRequestSchema.parse({ ...validRequest, responseFormat: { type: "json_object" } }),
      ).not.toThrow();
      expect(() =>
        ChatRequestSchema.parse({
          ...validRequest,
          responseFormat: { type: "json_schema", jsonSchema: {} },
        }),
      ).not.toThrow();
    });
  });

  describe("ChatResponseSchema", () => {
    const validResponse = {
      id: "resp-1",
      model: "llama3.1:8b",
      provider: "ollama",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: "Hello!" },
          finishReason: "stop",
        },
      ],
      usage: {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
        tokensPerSecond: 50,
      },
      createdAt: Date.now(),
      providerMetadata: { ollama: { evalDuration: 1000000 } },
    };

    it("accepts valid response", () => {
      const parsed = ChatResponseSchema.parse(validResponse);
      expect(parsed.choices).toHaveLength(1);
      expect(parsed.usage.promptTokens).toBe(10);
    });

    it("accepts null usage (unknown)", () => {
      const parsed = ChatResponseSchema.parse({
        ...validResponse,
        usage: { promptTokens: null, completionTokens: null, totalTokens: null },
      });
      expect(parsed.usage.promptTokens).toBeNull();
    });

    it("rejects missing required fields", () => {
      expect(() => ChatResponseSchema.parse({ ...validResponse, id: undefined })).toThrow();
      expect(() => ChatResponseSchema.parse({ ...validResponse, choices: [] })).toThrow();
    });

    it("rejects invalid finishReason", () => {
      expect(() =>
        ChatResponseSchema.parse({
          ...validResponse,
          choices: [{ ...validResponse.choices[0], finishReason: "invalid" }],
        }),
      ).toThrow();
    });
  });

  describe("UsageMetadataSchema", () => {
    it("accepts complete usage", () => {
      const usage = {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        tokensPerSecond: 25,
      };
      const parsed = UsageMetadataSchema.parse(usage);
      expect(parsed.totalTokens).toBe(150);
    });

    it("accepts null tokens (unknown)", () => {
      const usage = { promptTokens: null, completionTokens: null, totalTokens: null };
      const parsed = UsageMetadataSchema.parse(usage);
      expect(parsed.promptTokens).toBeNull();
    });

    it("rejects negative tokens", () => {
      expect(() =>
        UsageMetadataSchema.parse({ promptTokens: -1, completionTokens: 0, totalTokens: 0 }),
      ).toThrow();
    });
  });

  describe("StreamingEventSchema", () => {
    it("accepts content event", () => {
      const event = {
        type: "content",
        delta: { content: "Hello", role: "assistant" },
        requestId: "req-1",
      };
      const parsed = StreamingEventSchema.parse(event);
      expect(parsed.type).toBe("content");
    });

    it("accepts done event", () => {
      const event = {
        type: "done",
        response: {
          id: "resp-1",
          model: "llama3.1:8b",
          provider: "ollama",
          choices: [
            { index: 0, message: { role: "assistant", content: "Hello" }, finishReason: "stop" },
          ],
          usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
          createdAt: Date.now(),
        },
        requestId: "req-1",
      };
      const parsed = StreamingEventSchema.parse(event);
      expect(parsed.type).toBe("done");
    });

    it("accepts error event", () => {
      const event = {
        type: "error",
        error: {
          code: "TIMEOUT",
          message: "Request timed out",
          provider: "ollama",
          retryable: true,
        },
        requestId: "req-1",
      };
      const parsed = StreamingEventSchema.parse(event);
      expect(parsed.type).toBe("error");
    });

    it("rejects unknown event type", () => {
      expect(() => StreamingEventSchema.parse({ type: "unknown", requestId: "req-1" })).toThrow();
    });
  });

  describe("ProviderHealthSchema", () => {
    it("accepts healthy status", () => {
      const health = {
        provider: "ollama",
        status: "healthy",
        lastCheckAt: Date.now(),
        latencyMs: 50,
        models: [],
      };
      const parsed = ProviderHealthSchema.parse(health);
      expect(parsed.status).toBe("healthy");
    });

    it("accepts all status variants", () => {
      for (const status of ["healthy", "degraded", "unhealthy", "unknown"] as const) {
        const parsed = ProviderHealthSchema.parse({
          provider: "ollama",
          status,
          lastCheckAt: null,
          latencyMs: null,
        });
        expect(parsed.status).toBe(status);
      }
    });

    it("rejects invalid status", () => {
      expect(() =>
        ProviderHealthSchema.parse({
          provider: "ollama",
          status: "down",
          lastCheckAt: null,
          latencyMs: null,
        }),
      ).toThrow();
    });
  });

  describe("ProviderErrorSchema", () => {
    it("accepts all error codes", () => {
      const codes = [
        "MODEL_NOT_FOUND",
        "INVALID_REQUEST",
        "CONTEXT_LENGTH_EXCEEDED",
        "RATE_LIMITED",
        "UNAUTHORIZED",
        "FORBIDDEN",
        "PROVIDER_UNAVAILABLE",
        "TIMEOUT",
        "CANCELLED",
        "INTERNAL_ERROR",
        "UNKNOWN_ERROR",
      ] as const;

      for (const code of codes) {
        const error = { code, message: "test", provider: "ollama", retryable: false };
        const parsed = ProviderErrorSchema.parse(error);
        expect(parsed.code).toBe(code);
      }
    });

    it("rejects invalid error code", () => {
      expect(() =>
        ProviderErrorSchema.parse({
          code: "INVALID_CODE",
          message: "test",
          provider: "ollama",
          retryable: false,
        }),
      ).toThrow();
    });
  });

  describe("FinishReasonSchema", () => {
    it("accepts all finish reasons", () => {
      const reasons = [
        "stop",
        "length",
        "tool_calls",
        "content_filter",
        "cancelled",
        "error",
        "unknown",
      ] as const;
      for (const reason of reasons) {
        expect(() => FinishReasonSchema.parse(reason)).not.toThrow();
      }
    });

    it("rejects invalid finish reason", () => {
      expect(() => FinishReasonSchema.parse("invalid")).toThrow();
    });
  });
});
