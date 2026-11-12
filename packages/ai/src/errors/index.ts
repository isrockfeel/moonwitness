/**
 * Typed error hierarchy for AI provider errors.
 * Extends the base DomainError from @moonwitness/errors.
 */

import type { ProviderErrorCode } from "../schemas";
import { DomainError, isDomainError } from "@moonwitness/errors";

// ============================================================================
// Provider Error Base Class
// ============================================================================

/**
 * Base class for all provider-specific errors.
 * Provides structured error information for handling and retry logic.
 */
export class ProviderError extends DomainError {
  public readonly providerId: string;
  public readonly retryable: boolean;
  public override readonly cause?: Error;

  constructor(
    message: string,
    code: ProviderErrorCode,
    provider: string,
    retryable: boolean = false,
    cause?: Error,
  ) {
    super(message, code);
    this.name = "ProviderError";
    this.providerId = provider;
    this.retryable = retryable;
    this.cause = cause;

    // Maintains proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ProviderError.prototype);
  }

  /** Provider identifier (alias for providerId). */
  get provider(): string {
    return this.providerId;
  }

  /** Creates a ProviderError from a plain object (e.g., from schema parse). */
  static fromObject(obj: {
    code: ProviderErrorCode;
    message: string;
    provider: string;
    retryable: boolean;
    cause?: Error;
  }): ProviderError {
    return new ProviderError(obj.message, obj.code, obj.provider, obj.retryable, obj.cause);
  }

  /** Checks if an error is a ProviderError. */
  static isProviderError(value: unknown): value is ProviderError {
    return value instanceof ProviderError;
  }
}

// ============================================================================
// Specific Provider Error Subclasses
// ============================================================================

/** Requested model does not exist or is not available. */
export class ModelNotFoundError extends ProviderError {
  public readonly modelId: string;

  constructor(modelId: string, provider: string, cause?: Error) {
    super(`Model '${modelId}' not found`, "MODEL_NOT_FOUND", provider, false, cause);
    
    this.modelId = modelId;
    Object.setPrototypeOf(this, ModelNotFoundError.prototype);
  }
}

/** Request validation failed (invalid parameters, schema violation). */
export class InvalidRequestError extends ProviderError {
  public readonly details?: Record<string, unknown>;

  constructor(message: string, provider: string, details?: Record<string, unknown>, cause?: Error) {
    super(message, "INVALID_REQUEST", provider, false, cause);
    
    this.details = details;
    Object.setPrototypeOf(this, InvalidRequestError.prototype);
  }
}

/** Request exceeds model's context window. */
export class ContextLengthExceededError extends ProviderError {
  public readonly requestedTokens: number;
  public readonly maxTokens: number;

  constructor(
    requestedTokens: number,
    maxTokens: number,
    provider: string,
    cause?: Error,
  ) {
    super(
      `Context length exceeded: requested ${requestedTokens} tokens, maximum is ${maxTokens}`,
      "CONTEXT_LENGTH_EXCEEDED",
      provider,
      false,
      cause,
    );
    
    this.requestedTokens = requestedTokens;
    this.maxTokens = maxTokens;
    Object.setPrototypeOf(this, ContextLengthExceededError.prototype);
  }
}

/** Rate limit exceeded. */
export class RateLimitedError extends ProviderError {
  public readonly retryAfterMs?: number;

  constructor(provider: string, retryAfterMs?: number, cause?: Error) {
    super("Rate limit exceeded", "RATE_LIMITED", provider, true, cause);
    
    this.retryAfterMs = retryAfterMs;
    Object.setPrototypeOf(this, RateLimitedError.prototype);
  }
}

/** Authentication failed. */
export class UnauthorizedError extends ProviderError {
  constructor(provider: string, cause?: Error) {
    super("Authentication failed", "UNAUTHORIZED", provider, false, cause);
    
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

/** Access forbidden (insufficient permissions). */
export class ForbiddenError extends ProviderError {
  constructor(provider: string, cause?: Error) {
    super("Access forbidden", "FORBIDDEN", provider, false, cause);
    
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/** Provider service is unavailable. */
export class ProviderUnavailableError extends ProviderError {
  constructor(provider: string, cause?: Error) {
    super("Provider unavailable", "PROVIDER_UNAVAILABLE", provider, true, cause);
    
    Object.setPrototypeOf(this, ProviderUnavailableError.prototype);
  }
}

/** Request timed out. */
export class ProviderTimeoutError extends ProviderError {
  public readonly timeoutMs: number;

  constructor(timeoutMs: number, provider: string, cause?: Error) {
    super(`Request timed out after ${timeoutMs}ms`, "TIMEOUT", provider, true, cause);
    
    this.timeoutMs = timeoutMs;
    Object.setPrototypeOf(this, ProviderTimeoutError.prototype);
  }
}

/** Request was cancelled. */
export class CancelledError extends ProviderError {
  constructor(provider: string, cause?: Error) {
    super("Request cancelled", "CANCELLED", provider, false, cause);
    
    Object.setPrototypeOf(this, CancelledError.prototype);
  }
}

/** Internal provider error. */
export class InternalProviderError extends ProviderError {
  constructor(message: string, provider: string, cause?: Error) {
    super(message, "INTERNAL_ERROR", provider, true, cause);
    
    Object.setPrototypeOf(this, InternalProviderError.prototype);
  }
}

/** Unknown/unclassified error. */
export class UnknownProviderError extends ProviderError {
  constructor(message: string, provider: string, cause?: Error) {
    super(message, "UNKNOWN_ERROR", provider, false, cause);
    
    Object.setPrototypeOf(this, UnknownProviderError.prototype);
  }
}

// ============================================================================
// Error Factory & Utilities
// ============================================================================

/**
 * Creates a typed ProviderError from a generic error or provider response.
 * Attempts to classify the error based on message/content.
 */
export function createProviderError(
  error: unknown,
  provider: string,
  context?: { modelId?: string; timeoutMs?: number },
): ProviderError {
  // Already a ProviderError
  if (ProviderError.isProviderError(error)) {
    return error;
  }

  // DomainError from @moonwitness/errors
  if (isDomainError(error)) {
    switch (error.code) {
      case "VALIDATION_ERROR":
        return new InvalidRequestError(error.message, provider);
      case "NOT_FOUND_ERROR":
        return new ModelNotFoundError(context?.modelId ?? "unknown", provider, error);
      case "TIMEOUT_ERROR":
        return new ProviderTimeoutError(context?.timeoutMs ?? 0, provider, error);
      default:
        return new UnknownProviderError(error.message, provider, error);
    }
  }

  // Plain object with error field (e.g., from provider JSON response)
  if (error && typeof error === "object" && "error" in error && typeof (error as Record<string, unknown>).error === "string") {
    const message = String((error as Record<string, unknown>).error).toLowerCase();
    if (message.includes("not found") || message.includes("model not found") || message.includes("no such model")) {
      return new ModelNotFoundError(context?.modelId ?? "unknown", provider);
    }
    if (message.includes("context length") || message.includes("max tokens") || message.includes("token limit") || message.includes("too long")) {
      return new ContextLengthExceededError(0, 0, provider);
    }
    if (message.includes("rate limit") || message.includes("too many requests") || message.includes("429")) {
      return new RateLimitedError(provider, undefined);
    }
    if (message.includes("unauthorized") || message.includes("authentication") || message.includes("401")) {
      return new UnauthorizedError(provider);
    }
    if (message.includes("forbidden") || message.includes("403")) {
      return new ForbiddenError(provider);
    }
    if (message.includes("timeout") || message.includes("timed out") || message.includes("etimedout")) {
      return new ProviderTimeoutError(context?.timeoutMs ?? 0, provider);
    }
    if (message.includes("cancelled") || message.includes("aborted") || message.includes("aborterror")) {
      return new CancelledError(provider);
    }
    if (message.includes("unavailable") || message.includes("503") || message.includes("502") || message.includes("504") || message.includes("econnrefused")) {
      return new ProviderUnavailableError(provider);
    }
    if (message.includes("500") || message.includes("internal server error")) {
      return new InternalProviderError(String((error as Record<string, unknown>).error), provider);
    }
    return new UnknownProviderError(String((error as Record<string, unknown>).error), provider);
  }

  // Native Error
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Classify by message content
    if (
      message.includes("not found") ||
      message.includes("model not found") ||
      message.includes("no such model")
    ) {
      return new ModelNotFoundError(context?.modelId ?? "unknown", provider, error);
    }
    if (
      message.includes("context length") ||
      message.includes("max tokens") ||
      message.includes("token limit") ||
      message.includes("too long")
    ) {
      return new ContextLengthExceededError(0, 0, provider, error);
    }
    if (
      message.includes("rate limit") ||
      message.includes("too many requests") ||
      message.includes("429")
    ) {
      return new RateLimitedError(provider, undefined, error);
    }
    if (
      message.includes("unauthorized") ||
      message.includes("authentication") ||
      message.includes("401")
    ) {
      return new UnauthorizedError(provider, error);
    }
    if (message.includes("forbidden") || message.includes("403")) {
      return new ForbiddenError(provider, error);
    }
    if (
      message.includes("timeout") ||
      message.includes("timed out") ||
      message.includes("etimedout")
    ) {
      return new ProviderTimeoutError(context?.timeoutMs ?? 0, provider, error);
    }
    if (
      message.includes("cancelled") ||
      message.includes("aborted") ||
      message.includes("aborterror")
    ) {
      return new CancelledError(provider, error);
    }
    if (
      message.includes("unavailable") ||
      message.includes("503") ||
      message.includes("502") ||
      message.includes("504") ||
      message.includes("econnrefused")
    ) {
      return new ProviderUnavailableError(provider, error);
    }
    if (message.includes("500") || message.includes("internal server error")) {
      return new InternalProviderError(error.message, provider, error);
    }

    return new UnknownProviderError(error.message, provider, error);
  }

  // Unknown type
  return new UnknownProviderError(String(error), provider);
}

/**
 * Type guard for retryable errors.
 */
export function isRetryableError(error: unknown): boolean {
  if (ProviderError.isProviderError(error)) {
    return error.retryable;
  }
  if (isDomainError(error)) {
    return error.code === "TIMEOUT_ERROR";
  }
  if (error instanceof Error) {
    return error.name === "AbortError" || error.message.includes("timeout");
  }
  return false;
}

/**
 * Type guard for cancellation errors.
 */
export function isCancellationError(error: unknown): boolean {
  if (ProviderError.isProviderError(error)) {
    return error.code === "CANCELLED";
  }
  if (error instanceof Error) {
    return error.name === "AbortError" || error.message.includes("cancelled");
  }
  return false;
}

/**
 * Type guard for model not found errors.
 */
export function isModelNotFoundError(error: unknown): error is ModelNotFoundError {
  return error instanceof ModelNotFoundError;
}

/**
 * Type guard for context length exceeded errors.
 */
export function isContextLengthExceededError(error: unknown): error is ContextLengthExceededError {
  return error instanceof ContextLengthExceededError;
}