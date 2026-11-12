/**
 * Provider-neutral AI contracts for RIOT Intelligence.
 * These types define the domain-level interface without coupling to any specific provider.
 */

// ============================================================================
// Model Identity & Capabilities
// ============================================================================

/** Unique identifier for a model within a provider namespace. */
export interface ModelIdentity {
  /** Provider-scoped model ID (e.g., "llama3.1:8b", "gpt-4o"). */
  id: string;
  /** Human-readable display name. */
  name: string;
  /** Provider identifier (e.g., "ollama", "openai", "llamacpp"). */
  provider: string;
  /** Optional version/tag information. */
  version?: string;
  /** Model capabilities. */
  capabilities: ModelCapabilities;
  /** Model parameter count if known (e.g., "8B", "70B"). */
  parameterCount?: string;
  /** Model quantization if applicable (e.g., "Q4_K_M", "FP16"). */
  quantization?: string;
}

/** Capabilities a model may support. */
export interface ModelCapabilities {
  /** Supports chat completion. */
  chat: boolean;
  /** Supports streaming responses. */
  streaming: boolean;
  /** Supports tool/function calling. */
  tools: boolean;
  /** Supports structured output (JSON schema). */
  structuredOutput: boolean;
  /** Supports vision/multimodal input. */
  vision: boolean;
  /** Supports embeddings generation. */
  embeddings: boolean;
  /** Maximum context window in tokens. */
  contextWindow?: number;
  /** Maximum output tokens. */
  maxOutputTokens?: number;
}

// ============================================================================
// Chat Request / Response
// ============================================================================

/** Role of a message in a conversation. */
export type ChatRole = "system" | "user" | "assistant" | "tool";

/** Base message structure. */
export interface ChatMessage {
  role: ChatRole;
  content: string;
  /** Optional name for tool messages. */
  name?: string;
  /** Tool call ID for tool response messages. */
  toolCallId?: string;
  /** Tool calls made by the assistant. */
  toolCalls?: ToolCall[];
}

/** Tool/function definition. */
export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>; // JSON Schema
  };
}

/** Tool call made by the model. */
export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

/** Options for chat completion request. */
export interface ChatRequestOptions {
  /** Model identifier to use. */
  model: string;
  /** Messages in the conversation. */
  messages: ChatMessage[];
  /** Sampling temperature (0.0 - 2.0). */
  temperature?: number;
  /** Nucleus sampling parameter. */
  topP?: number;
  /** Maximum tokens to generate. */
  maxTokens?: number;
  /** Stop sequences. */
  stop?: string[];
  /** Tools available for the model to call. */
  tools?: ToolDefinition[];
  /** Tool choice behavior. */
  toolChoice?: "none" | "auto" | "required" | { type: "function"; function: { name: string } };
  /** Response format for structured output. */
  responseFormat?: { type: "json_object" } | { type: "json_schema"; jsonSchema: Record<string, unknown> };
  /** Random seed for reproducibility. */
  seed?: number;
  /** User identifier for tracking. */
  user?: string;
}

/** Complete chat request. */
export interface ChatRequest extends ChatRequestOptions {
  /** Request ID for tracing. */
  requestId: string;
  /** Timeout in milliseconds. */
  timeoutMs?: number;
  /** Abort signal for cancellation. */
  signal?: AbortSignal;
}

/** Finish reason for a chat completion. */
export type FinishReason =
  | "stop"
  | "length"
  | "tool_calls"
  | "content_filter"
  | "cancelled"
  | "error"
  | "unknown";

/** Choice in a chat completion response. */
export interface ChatChoice {
  index: number;
  message: ChatMessage;
  finishReason: FinishReason;
}

/** Token usage metadata. Values are null when unknown/unavailable. */
export interface UsageMetadata {
  /** Prompt tokens consumed. */
  promptTokens: number | null;
  /** Completion tokens generated. */
  completionTokens: number | null;
  /** Total tokens (prompt + completion). */
  totalTokens: number | null;
  /** Tokens per second (streaming). */
  tokensPerSecond?: number | null;
}

/** Complete chat response (non-streaming). */
export interface ChatResponse {
  id: string;
  model: string;
  provider: string;
  choices: ChatChoice[];
  usage: UsageMetadata;
  createdAt: number; // Unix timestamp ms
  /** Provider-specific metadata (opaque to domain). */
  providerMetadata?: Record<string, unknown>;
}

// ============================================================================
// Streaming Events
// ============================================================================

/** Delta content in a streaming chunk. */
export interface StreamingDelta {
  /** Role of the message (typically "assistant" for deltas). */
  role?: ChatRole;
  /** Text content delta. */
  content?: string;
  /** Tool call delta. */
  toolCalls?: ToolCallDelta[];
}

/** Incremental tool call during streaming. */
export interface ToolCallDelta {
  index: number;
  id?: string;
  type?: "function";
  function?: {
    name?: string;
    arguments?: string; // Incremental JSON string
  };
}

/** Streaming event types. */
export type StreamingEvent =
  | { type: "content"; delta: StreamingDelta; requestId: string }
  | { type: "done"; response: ChatResponse; requestId: string }
  | { type: "error"; error: ProviderError; requestId: string };

/** Helper to check if streaming is done. */
export function isStreamingDone(event: StreamingEvent): event is StreamingEvent & { type: "done" } {
  return event.type === "done";
}

/** Helper to check if streaming error. */
export function isStreamingError(event: StreamingEvent): event is StreamingEvent & { type: "error" } {
  return event.type === "error";
}

/** Helper to check if streaming content. */
export function isStreamingContent(event: StreamingEvent): event is StreamingEvent & { type: "content" } {
  return event.type === "content";
}

// ============================================================================
// Provider Health & Status
// ============================================================================

/** Provider health state. */
export type ProviderHealthStatus = "healthy" | "degraded" | "unhealthy" | "unknown";

/** Provider health information. */
export interface ProviderHealth {
  /** Provider identifier. */
  provider: string;
  /** Current health status. */
  status: ProviderHealthStatus;
  /** Last successful check timestamp (ms). */
  lastCheckAt: number | null;
  /** Latency of last check in ms. */
  latencyMs: number | null;
  /** Error message if unhealthy. */
  error?: string;
  /** Available models (if known). */
  models?: ModelIdentity[];
  /** Additional provider-specific details. */
  details?: Record<string, unknown>;
}

/** Provider information for discovery. */
export interface ProviderInfo {
  id: string;
  name: string;
  version?: string;
  capabilities: ProviderCapabilities;
  defaultModel?: string;
}

/** Provider capability flags. */
export interface ProviderCapabilities {
  chat: boolean;
  streaming: boolean;
  tools: boolean;
  structuredOutput: boolean;
  vision: boolean;
  embeddings: boolean;
  modelListing: boolean;
  healthCheck: boolean;
  cancellation: boolean;
}