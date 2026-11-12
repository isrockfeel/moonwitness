/**
 * Zod schemas for AI provider-neutral contracts.
 * Used for runtime validation at trust boundaries.
 */

import { z } from "zod";

// ============================================================================
// Model Identity & Capabilities Schemas
// ============================================================================

export const ModelCapabilitiesSchema = z.object({
  chat: z.boolean(),
  streaming: z.boolean(),
  tools: z.boolean(),
  structuredOutput: z.boolean(),
  vision: z.boolean(),
  embeddings: z.boolean(),
  contextWindow: z.number().int().positive().optional(),
  maxOutputTokens: z.number().int().positive().optional(),
});

export type ModelCapabilities = z.infer<typeof ModelCapabilitiesSchema>;

export const ModelIdentitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  provider: z.string().min(1),
  version: z.string().optional(),
  capabilities: ModelCapabilitiesSchema,
  parameterCount: z.string().optional(),
  quantization: z.string().optional(),
});

export type ModelIdentity = z.infer<typeof ModelIdentitySchema>;

// ============================================================================
// Chat Message Schemas
// ============================================================================

export const ChatRoleSchema = z.enum(["system", "user", "assistant", "tool"]);

export type ChatRole = z.infer<typeof ChatRoleSchema>;

export const ToolCallSchema = z.object({
  id: z.string().min(1),
  type: z.literal("function"),
  function: z.object({
    name: z.string().min(1),
    arguments: z.string(), // JSON string
  }),
});

export type ToolCall = z.infer<typeof ToolCallSchema>;

export const ChatMessageSchema = z.object({
  role: ChatRoleSchema,
  content: z.string(),
  name: z.string().optional(),
  toolCallId: z.string().optional(),
  toolCalls: z.array(ToolCallSchema).optional(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ToolDefinitionSchema = z.object({
  type: z.literal("function"),
  function: z.object({
    name: z.string().min(1),
    description: z.string(),
    parameters: z.record(z.unknown()), // JSON Schema
  }),
});

export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>;

// ============================================================================
// Chat Request/Response Schemas
// ============================================================================

export const ChatRequestOptionsSchema = z.object({
  model: z.string().min(1),
  messages: z.array(ChatMessageSchema).min(1),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  maxTokens: z.number().int().positive().optional(),
  stop: z.array(z.string()).optional(),
  tools: z.array(ToolDefinitionSchema).optional(),
  toolChoice: z
    .union([
      z.literal("none"),
      z.literal("auto"),
      z.literal("required"),
      z.object({
        type: z.literal("function"),
        function: z.object({ name: z.string().min(1) }),
      }),
    ])
    .optional(),
  responseFormat: z
    .union([
      z.object({ type: z.literal("json_object") }),
      z.object({ type: z.literal("json_schema"), jsonSchema: z.record(z.unknown()) }),
    ])
    .optional(),
  seed: z.number().int().optional(),
  user: z.string().optional(),
});

export type ChatRequestOptions = z.infer<typeof ChatRequestOptionsSchema>;

export const ChatRequestSchema = ChatRequestOptionsSchema.extend({
  requestId: z.string().min(1),
  timeoutMs: z.number().int().positive().optional(),
  // signal is not serializable, validated at runtime
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const FinishReasonSchema = z.enum([
  "stop",
  "length",
  "tool_calls",
  "content_filter",
  "cancelled",
  "error",
  "unknown",
]);

export type FinishReason = z.infer<typeof FinishReasonSchema>;

export const UsageMetadataSchema = z.object({
  promptTokens: z.number().int().nonnegative().nullable(),
  completionTokens: z.number().int().nonnegative().nullable(),
  totalTokens: z.number().int().nonnegative().nullable(),
  tokensPerSecond: z.number().nonnegative().nullable().optional(),
});

export type UsageMetadata = z.infer<typeof UsageMetadataSchema>;

export const ChatChoiceSchema = z.object({
  index: z.number().int().nonnegative(),
  message: ChatMessageSchema,
  finishReason: FinishReasonSchema,
});

export type ChatChoice = z.infer<typeof ChatChoiceSchema>;

export const ChatResponseSchema = z.object({
  id: z.string().min(1),
  model: z.string().min(1),
  provider: z.string().min(1),
  choices: z.array(ChatChoiceSchema).min(1),
  usage: UsageMetadataSchema,
  createdAt: z.number().int().positive(),
  providerMetadata: z.record(z.unknown()).optional(),
});

export type ChatResponse = z.infer<typeof ChatResponseSchema>;

// ============================================================================
// Streaming Event Schemas
// ============================================================================

export const ToolCallDeltaSchema = z.object({
  index: z.number().int().nonnegative(),
  id: z.string().optional(),
  type: z.literal("function").optional(),
  function: z
    .object({
      name: z.string().optional(),
      arguments: z.string().optional(),
    })
    .optional(),
});

export type ToolCallDelta = z.infer<typeof ToolCallDeltaSchema>;

export const StreamingDeltaSchema = z.object({
  role: ChatRoleSchema.optional(),
  content: z.string().optional(),
  toolCalls: z.array(ToolCallDeltaSchema).optional(),
});

export type StreamingDelta = z.infer<typeof StreamingDeltaSchema>;

export const StreamingContentEventSchema = z.object({
  type: z.literal("content"),
  delta: StreamingDeltaSchema,
  requestId: z.string().min(1),
});

export type StreamingContentEvent = z.infer<typeof StreamingContentEventSchema>;

export const StreamingDoneEventSchema = z.object({
  type: z.literal("done"),
  response: ChatResponseSchema,
  requestId: z.string().min(1),
});

export type StreamingDoneEvent = z.infer<typeof StreamingDoneEventSchema>;

export const StreamingErrorEventSchema = z.object({
  type: z.literal("error"),
  error: z.object({
    code: z.string(),
    message: z.string(),
    provider: z.string(),
    retryable: z.boolean(),
    cause: z.unknown().optional(),
  }),
  requestId: z.string().min(1),
});

export type StreamingErrorEvent = z.infer<typeof StreamingErrorEventSchema>;

export const StreamingEventSchema = z.discriminatedUnion("type", [
  StreamingContentEventSchema,
  StreamingDoneEventSchema,
  StreamingErrorEventSchema,
]);

export type StreamingEvent = z.infer<typeof StreamingEventSchema>;

// ============================================================================
// Provider Health Schemas
// ============================================================================

export const ProviderHealthStatusSchema = z.enum([
  "healthy",
  "degraded",
  "unhealthy",
  "unknown",
]);

export type ProviderHealthStatus = z.infer<typeof ProviderHealthStatusSchema>;

export const ProviderHealthSchema = z.object({
  provider: z.string().min(1),
  status: ProviderHealthStatusSchema,
  lastCheckAt: z.number().int().nonnegative().nullable(),
  latencyMs: z.number().int().nonnegative().nullable(),
  error: z.string().optional(),
  models: z.array(ModelIdentitySchema).optional(),
  details: z.record(z.unknown()).optional(),
});

export type ProviderHealth = z.infer<typeof ProviderHealthSchema>;

export const ProviderCapabilitiesSchema = z.object({
  chat: z.boolean(),
  streaming: z.boolean(),
  tools: z.boolean(),
  structuredOutput: z.boolean(),
  vision: z.boolean(),
  embeddings: z.boolean(),
  modelListing: z.boolean(),
  healthCheck: z.boolean(),
  cancellation: z.boolean(),
});

export type ProviderCapabilities = z.infer<typeof ProviderCapabilitiesSchema>;

export const ProviderInfoSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  version: z.string().optional(),
  capabilities: ProviderCapabilitiesSchema,
  defaultModel: z.string().optional(),
});

export type ProviderInfo = z.infer<typeof ProviderInfoSchema>;

// ============================================================================
// Error Schemas
// ============================================================================

export const ProviderErrorCodeSchema = z.enum([
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
]);

export type ProviderErrorCode = z.infer<typeof ProviderErrorCodeSchema>;

export const ProviderErrorSchema = z.object({
  code: ProviderErrorCodeSchema,
  message: z.string().min(1),
  provider: z.string().min(1),
  retryable: z.boolean(),
  cause: z.unknown().optional(),
});

export type ProviderError = z.infer<typeof ProviderErrorSchema>;