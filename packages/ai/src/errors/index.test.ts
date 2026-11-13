/**
 * Unit tests for AI provider error hierarchy.
 */

import { describe, expect, it } from "vitest";

import {
  ProviderError,
  ModelNotFoundError,
  InvalidRequestError,
  ContextLengthExceededError,
  RateLimitedError,
  UnauthorizedError,
  ForbiddenError,
  ProviderUnavailableError,
  ProviderTimeoutError,
  CancelledError,
  InternalProviderError,
  UnknownProviderError,
  createProviderError,
  isRetryableError,
  isCancellationError,
  isModelNotFoundError,
  isContextLengthExceededError,
} from "./index";

describe("AI Provider Errors", () => {
  describe("ProviderError base class", () => {
    it("creates error with all properties", () => {
      const error = new ProviderError("Test error", "INVALID_REQUEST", "ollama", false);
      expect(error.message).toBe("Test error");
      expect(error.code).toBe("INVALID_REQUEST");
      expect(error.provider).toBe("ollama");
      expect(error.retryable).toBe(false);
      expect(error.name).toBe("ProviderError");
    });

    it("supports fromObject factory", () => {
      const error = ProviderError.fromObject({
        code: "TIMEOUT",
        message: "Timed out",
        provider: "ollama",
        retryable: true,
      });
      expect(error.code).toBe("TIMEOUT");
      expect(error.retryable).toBe(true);
    });

    it("isProviderError type guard works", () => {
      const error = new ProviderError("test", "UNKNOWN_ERROR", "ollama");
      expect(ProviderError.isProviderError(error)).toBe(true);
      expect(ProviderError.isProviderError(new Error())).toBe(false);
      expect(ProviderError.isProviderError(null)).toBe(false);
    });
  });

  describe("Specific error subclasses", () => {
    it("ModelNotFoundError includes modelId", () => {
      const error = new ModelNotFoundError("llama3.1:8b", "ollama");
      expect(error.code).toBe("MODEL_NOT_FOUND");
      expect(error.modelId).toBe("llama3.1:8b");
      expect(error.retryable).toBe(false);
    });

    it("InvalidRequestError includes details", () => {
      const error = new InvalidRequestError("Bad param", "ollama", { field: "temperature" });
      expect(error.code).toBe("INVALID_REQUEST");
      expect(error.details).toEqual({ field: "temperature" });
    });

    it("ContextLengthExceededError includes token counts", () => {
      const error = new ContextLengthExceededError(10000, 8192, "ollama");
      expect(error.code).toBe("CONTEXT_LENGTH_EXCEEDED");
      expect(error.requestedTokens).toBe(10000);
      expect(error.maxTokens).toBe(8192);
    });

    it("RateLimitedError includes retryAfterMs", () => {
      const error = new RateLimitedError("ollama", 5000);
      expect(error.code).toBe("RATE_LIMITED");
      expect(error.retryable).toBe(true);
      expect(error.retryAfterMs).toBe(5000);
    });

    it("UnauthorizedError has correct code", () => {
      const error = new UnauthorizedError("ollama");
      expect(error.code).toBe("UNAUTHORIZED");
      expect(error.retryable).toBe(false);
    });

    it("ForbiddenError has correct code", () => {
      const error = new ForbiddenError("ollama");
      expect(error.code).toBe("FORBIDDEN");
    });

    it("ProviderUnavailableError is retryable", () => {
      const error = new ProviderUnavailableError("ollama");
      expect(error.code).toBe("PROVIDER_UNAVAILABLE");
      expect(error.retryable).toBe(true);
    });

    it("ProviderTimeoutError includes timeoutMs", () => {
      const error = new ProviderTimeoutError(30000, "ollama");
      expect(error.code).toBe("TIMEOUT");
      expect(error.timeoutMs).toBe(30000);
      expect(error.retryable).toBe(true);
    });

    it("CancelledError is not retryable", () => {
      const error = new CancelledError("ollama");
      expect(error.code).toBe("CANCELLED");
      expect(error.retryable).toBe(false);
    });

    it("InternalProviderError is retryable", () => {
      const error = new InternalProviderError("Server crashed", "ollama");
      expect(error.code).toBe("INTERNAL_ERROR");
      expect(error.retryable).toBe(true);
    });

    it("UnknownProviderError is not retryable", () => {
      const error = new UnknownProviderError("Weird error", "ollama");
      expect(error.code).toBe("UNKNOWN_ERROR");
      expect(error.retryable).toBe(false);
    });
  });

  describe("createProviderError factory", () => {
    it("returns ProviderError as-is", () => {
      const original = new ProviderError("test", "TIMEOUT", "ollama", true);
      const result = createProviderError(original, "ollama");
      expect(result).toBe(original);
    });

    it("wraps DomainError from @moonwitness/errors", async () => {
      // Dynamic import works in vitest
      const { ValidationError: DomainValidationError } = await import("@moonwitness/errors");
      const domainError = new DomainValidationError("Invalid input");
      const result = createProviderError(domainError, "ollama");
      expect(result.code).toBe("INVALID_REQUEST");
    });

    it("classifies MODEL_NOT_FOUND from message", () => {
      const error = createProviderError(new Error("model 'xyz' not found"), "ollama", {
        modelId: "xyz",
      });
      expect(error.code).toBe("MODEL_NOT_FOUND");
      expect(isModelNotFoundError(error)).toBe(true);
    });

    it("classifies CONTEXT_LENGTH_EXCEEDED from message", () => {
      const error = createProviderError(new Error("context length exceeded"), "ollama");
      expect(error.code).toBe("CONTEXT_LENGTH_EXCEEDED");
      expect(isContextLengthExceededError(error)).toBe(true);
    });

    it("classifies RATE_LIMITED from message", () => {
      const error = createProviderError(new Error("rate limit exceeded"), "ollama");
      expect(error.code).toBe("RATE_LIMITED");
      expect(isRetryableError(error)).toBe(true);
    });

    it("classifies UNAUTHORIZED from message", () => {
      const error = createProviderError(new Error("unauthorized: invalid token"), "ollama");
      expect(error.code).toBe("UNAUTHORIZED");
    });

    it("classifies FORBIDDEN from message", () => {
      const error = createProviderError(new Error("forbidden: access denied"), "ollama");
      expect(error.code).toBe("FORBIDDEN");
    });

    it("classifies TIMEOUT from message", () => {
      const error = createProviderError(new Error("request timed out"), "ollama", {
        timeoutMs: 5000,
      });
      expect(error.code).toBe("TIMEOUT");
      expect(isRetryableError(error)).toBe(true);
    });

    it("classifies CANCELLED from AbortError", () => {
      const abortError = new DOMException("Aborted", "AbortError");
      const error = createProviderError(abortError, "ollama");
      expect(error.code).toBe("CANCELLED");
      expect(isCancellationError(error)).toBe(true);
    });

    it("classifies PROVIDER_UNAVAILABLE from connection errors", () => {
      const error = createProviderError(new Error("ECONNREFUSED"), "ollama");
      expect(error.code).toBe("PROVIDER_UNAVAILABLE");
      expect(isRetryableError(error)).toBe(true);
    });

    it("classifies INTERNAL_ERROR from 500", () => {
      const error = createProviderError(new Error("500 internal server error"), "ollama");
      expect(error.code).toBe("INTERNAL_ERROR");
      expect(isRetryableError(error)).toBe(true);
    });

    it("defaults to UNKNOWN_ERROR for unrecognized errors", () => {
      const error = createProviderError(new Error("something weird"), "ollama");
      expect(error.code).toBe("UNKNOWN_ERROR");
    });

    it("handles plain objects with error field", () => {
      const error = createProviderError({ error: "model not found" }, "ollama", {
        modelId: "test",
      });
      expect(error.code).toBe("MODEL_NOT_FOUND");
    });
  });

  describe("Type guards", () => {
    it("isRetryableError identifies retryable errors", () => {
      expect(isRetryableError(new RateLimitedError("ollama"))).toBe(true);
      expect(isRetryableError(new ProviderTimeoutError(1000, "ollama"))).toBe(true);
      expect(isRetryableError(new ProviderUnavailableError("ollama"))).toBe(true);
      expect(isRetryableError(new InternalProviderError("err", "ollama"))).toBe(true);
      expect(isRetryableError(new ModelNotFoundError("m", "ollama"))).toBe(false);
      expect(isRetryableError(new CancelledError("ollama"))).toBe(false);
    });

    it("isCancellationError identifies cancelled errors", () => {
      expect(isCancellationError(new CancelledError("ollama"))).toBe(true);
      expect(isCancellationError(new DOMException("Aborted", "AbortError"))).toBe(true);
      expect(isCancellationError(new ProviderTimeoutError(1000, "ollama"))).toBe(false);
    });

    it("isModelNotFoundError identifies model not found", () => {
      expect(isModelNotFoundError(new ModelNotFoundError("m", "ollama"))).toBe(true);
      expect(isModelNotFoundError(new InvalidRequestError("err", "ollama"))).toBe(false);
    });

    it("isContextLengthExceededError identifies context length errors", () => {
      expect(isContextLengthExceededError(new ContextLengthExceededError(100, 50, "ollama"))).toBe(
        true,
      );
      expect(isContextLengthExceededError(new ModelNotFoundError("m", "ollama"))).toBe(false);
    });
  });
});
