/**
 * @moonwitness/ai - Provider-neutral AI contracts for RIOT Intelligence.
 *
 * This package defines the core types, schemas, and error hierarchy for
 * interacting with AI inference providers without coupling to any specific vendor.
 */

// Types
export * from "./types";

// Schemas (runtime validation) - types are re-exported from types, so only export schema objects
export {
  // Model schemas
  ModelCapabilitiesSchema,
  ModelIdentitySchema,
  // Message schemas
  ChatRoleSchema,
  ToolCallSchema,
  ChatMessageSchema,
  ToolDefinitionSchema,
  // Request/Response schemas
  ChatRequestOptionsSchema,
  ChatRequestSchema,
  FinishReasonSchema,
  UsageMetadataSchema,
  ChatChoiceSchema,
  ChatResponseSchema,
  // Streaming schemas
  ToolCallDeltaSchema,
  StreamingDeltaSchema,
  StreamingContentEventSchema,
  StreamingDoneEventSchema,
  StreamingErrorEventSchema,
  StreamingEventSchema,
  // Provider schemas
  ProviderHealthStatusSchema,
  ProviderHealthSchema,
  ProviderCapabilitiesSchema,
  ProviderInfoSchema,
  // Error schemas
  ProviderErrorCodeSchema,
  ProviderErrorSchema,
} from "./schemas";

// Errors
export * from "./errors";

// Adapter exports (provider-specific, internal use)
export { OllamaAdapter } from "./adapters/ollama";
export type { OllamaAdapterOptions } from "./adapters/ollama";
