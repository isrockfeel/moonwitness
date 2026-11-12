/**
 * @moonwitness/ai - Provider-neutral AI contracts for RIOT Intelligence.
 *
 * This package defines the core types, schemas, and error hierarchy for
 * interacting with AI inference providers without coupling to any specific vendor.
 */

// Types
export * from "./types";

// Schemas (runtime validation)
export * from "./schemas";

// Errors
export * from "./errors";

// Adapter exports (provider-specific, internal use)
export { OllamaAdapter } from "./adapters/ollama";
export type { OllamaAdapterOptions } from "./adapters/ollama";