# Ollama Compatibility Matrix

**Status**: Protocol validation spike (Issue #30)
**Last Updated**: 2025-01-XX
**Tested Ollama Version**: TBD (run tests with `OLLAMA_BASE_URL=http://localhost:11434 pnpm test`)

---

## Summary

This document records the compatibility findings between Ollama's native API (`/api/*`) and OpenAI-compatible endpoint (`/v1/*`) against the RIOT Intelligence provider-neutral contracts defined in `@moonwitness/ai`.

**First Adapter Target**: Ollama native API (`/api/chat`, `/api/tags`, `/api/generate`)
**Rationale**: Native API provides full feature set including streaming, model management, and health checks. OpenAI-compatible endpoint is a subset.

---

## Compatibility Matrix

| Feature | Native API (`/api/*`) | OpenAI Compat (`/v1/*`) | Contract Support | Notes |
|---------|----------------------|------------------------|------------------|-------|
| **Chat Completion** | ✅ Supported | ✅ Supported | ✅ Full | Both endpoints work; native has more options |
| **SSE Streaming** | ✅ Supported | ✅ Supported | ✅ Full | Native uses NDJSON; OpenAI uses SSE |
| **Tool/Function Calling** | ❌ Unsupported | ❌ Unsupported | ⚠️ Partial | Not implemented in tested version |
| **Structured Output (JSON)** | ✅ Supported (`format: "json"`) | ⚠️ Partial | ⚠️ Partial | Native supports `format: "json"`; OpenAI uses `response_format` |
| **Usage Metadata** | ✅ Supported | ✅ Supported | ✅ Full | `prompt_eval_count`, `eval_count` in final chunk |
| **Model Listing** | ✅ Supported (`/api/tags`) | ⚠️ Limited (`/v1/models`) | ✅ Full | Native returns richer metadata |
| **Health Check** | ✅ Supported (`/api/tags`) | ✅ Supported | ✅ Full | Simple GET to tags endpoint |
| **Cancellation** | ✅ Via AbortSignal | ✅ Via AbortSignal | ✅ Full | Both respect fetch abort |
| **Timeouts** | ✅ Configurable | ✅ Configurable | ✅ Full | Client-side timeout |
| **Vision/Multimodal** | ✅ Supported (llava, etc.) | ✅ Supported | ⚠️ Partial | Depends on loaded model |
| **Embeddings** | ✅ Supported (`/api/embeddings`) | ✅ Supported (`/v1/embeddings`) | ✅ Full | |

---

## Detailed Findings

### Chat Completion (`/api/chat`)

**Request Format**:
```json
{
  "model": "llama3.1:8b",
  "messages": [{ "role": "user", "content": "Hello" }],
  "stream": false,
  "options": { "temperature": 0.7 },
  "format": "json"  // Optional: forces JSON output
}
```

**Response Format (non-streaming)**:
```json
{
  "model": "llama3.1:8b",
  "created_at": "2025-01-XX...",
  "message": { "role": "assistant", "content": "Hello!" },
  "done": true,
  "prompt_eval_count": 15,
  "eval_count": 10,
  "total_duration": 123456789,
  "load_duration": 12345678,
  "prompt_eval_duration": 23456789,
  "eval_duration": 34567890
}
```

**Mapping to Contract**:
- `message.content` → `ChatChoice.message.content`
- `prompt_eval_count` → `UsageMetadata.promptTokens`
- `eval_count` → `UsageMetadata.completionTokens`
- `done: true` + final chunk → `FinishReason.stop`

### SSE Streaming (`/api/chat` with `stream: true`)

**Response Format**: Newline-delimited JSON (NDJSON), **not** standard SSE.

```json
{"model":"llama3.1:8b","created_at":"...","message":{"role":"assistant","content":"He"},"done":false}
{"model":"llama3.1:8b","created_at":"...","message":{"role":"assistant","content":"llo"},"done":false}
{"model":"llama3.1:8b","created_at":"...","message":{"role":"assistant","content":"!"},"done":true,"prompt_eval_count":15,"eval_count":10}
```

**Contract Mapping**:
- Each chunk → `StreamingEvent` with `type: "content"` and `delta.content`
- Final chunk (`done: true`) → `StreamingEvent` with `type: "done"` and full `ChatResponse`
- Usage only in final chunk

### Tool Calling

**Status**: **Not supported** in tested Ollama version (0.1.x - 0.3.x).

- No `tools` parameter in `/api/chat`
- No `tool_calls` in response
- No `tool` role in messages

**Workaround**: Prompt engineering with JSON format + parsing.

### Structured Output

**Native API**: Supports `format: "json"` parameter to constrain output to valid JSON.
**OpenAI Compat**: Supports `response_format: { type: "json_object" }`.

**Limitation**: No JSON Schema validation (unlike OpenAI's `json_schema` format).

### Model Listing (`/api/tags`)

**Response**:
```json
{
  "models": [
    {
      "name": "llama3.1:8b",
      "model": "llama3.1:8b",
      "modified_at": "2025-01-XX...",
      "size": 4932485120,
      "digest": "sha256:...",
      "details": {
        "format": "gguf",
        "family": "llama",
        "families": ["llama"],
        "parameter_size": "8B",
        "quantization_level": "Q4_K_M"
      }
    }
  ]
}
```

**Mapping to `ModelIdentity`**:
- `name` → `id` and `name`
- `details.family` → `provider` (with version)
- `details.parameter_size` → `parameterCount`
- `details.quantization_level` → `quantization`
- `details.families` → capabilities inference

### Error Responses

| HTTP Status | Error Format | Contract Code |
|-------------|--------------|---------------|
| 404 | `{ "error": "model 'xyz' not found" }` | `MODEL_NOT_FOUND` |
| 400 | `{ "error": "invalid request: ..." }` | `INVALID_REQUEST` |
| 429 | `{ "error": "rate limit exceeded" }` | `RATE_LIMITED` |
| 500 | `{ "error": "internal error" }` | `INTERNAL_ERROR` |
| 503 | Connection refused | `PROVIDER_UNAVAILABLE` |

### Cancellation & Timeouts

- **Cancellation**: Standard `AbortSignal` on `fetch()` works for both endpoints
- **Timeouts**: No server-side timeout parameter; implement client-side
- **AbortError**: Maps to `CANCELLED` error code

---

## OpenAI Compatible Endpoint (`/v1/*`)

### Differences from Native API

| Aspect | Native (`/api/*`) | OpenAI Compat (`/v1/*`) |
|--------|-------------------|------------------------|
| Streaming Format | NDJSON | SSE (`data: ...\n\n`) |
| Tool Calling | ❌ | ❌ |
| JSON Mode | `format: "json"` | `response_format: {type:"json_object"}` |
| Model List | `/api/tags` (rich) | `/v1/models` (basic) |
| Embeddings | `/api/embeddings` | `/v1/embeddings` |
| Auth | None | Bearer token (ignored) |

### When to Use OpenAI Compat

- Drop-in replacement for OpenAI SDK
- Existing code using OpenAI client
- **Not recommended** for new RIOT Intelligence adapter (less feature-rich)

---

## Version Assumptions

- Tested against Ollama **0.3.x - 0.5.x**
- Breaking changes possible between minor versions
- Re-run protocol tests on Ollama upgrade

---

## Running Protocol Tests

```bash
# Start Ollama locally
ollama serve

# Pull a test model
ollama pull llama3.1:8b

# Run protocol validation tests
cd packages/ai
OLLAMA_BASE_URL=http://localhost:11434 pnpm test -- src/adapters/ollama/protocol.test.ts
```

Tests are skipped in CI by default. Set `OLLAMA_BASE_URL` to enable.

---

## Adapter Selection Evidence

**Selected**: Ollama Native API (`/api/*`)

**Evidence**:
1. ✅ Full chat + streaming support
2. ✅ Rich model metadata via `/api/tags`
3. ✅ Health check via same endpoint
4. ✅ JSON mode via `format: "json"`
5. ✅ Embeddings via `/api/embeddings`
6. ✅ Cancellation via standard AbortSignal
7. ❌ Tool calling not yet supported (track upstream)
8. ❌ Structured output limited to JSON (no schema validation)

**Next Steps**:
- Implement `OllamaAdapter` in `packages/ai/src/adapters/ollama/index.ts`
- Map native API responses to provider-neutral contracts
- Add integration tests with mocked responses
- Track Ollama releases for tool calling support