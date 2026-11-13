# OpenAI-Compatible Protocol Validation

**Status**: Validation pending (Issue #30)
**Protocol scope**: OpenAI-compatible HTTP API (`/v1/*`) only
**Live runtime/version**: Not yet recorded

## Decision

The first local-inference adapter will use the OpenAI-compatible API. Provider-
native APIs, including Ollama `/api/*`, are out of scope. Ollama `/v1`,
llama.cpp server, and vLLM are candidate hosts, not separately supported
protocols.

## Protocol surface to validate

| Capability               | Endpoint / format                             | Validation status            |
| ------------------------ | --------------------------------------------- | ---------------------------- |
| List models              | `GET /v1/models`                              | Pending live endpoint        |
| Non-streaming chat       | `POST /v1/chat/completions`, `stream: false`  | Pending live endpoint        |
| Streaming chat           | `POST /v1/chat/completions`, SSE and `[DONE]` | Pending live endpoint        |
| Tool calls               | `tools` and `tool_calls` fields               | Runtime variation unverified |
| Usage and finish reason  | `usage`, `finish_reason`                      | Runtime variation unverified |
| Errors and missing model | HTTP error response                           | Runtime variation unverified |
| Cancellation and timeout | Client-side `AbortSignal`                     | Pending live endpoint        |

These are protocol expectations, not claims that a particular server implements
them identically. Record the runtime, version, endpoint configuration, and
observed deviations when a live run is performed.

## Opt-in test configuration

The integration tests are skipped unless both `OPENAI_COMPATIBLE_BASE_URL` and
`OPENAI_COMPATIBLE_MODEL` are configured. The base URL must include the API
prefix, for example `http://localhost:11434/v1`. `OPENAI_COMPATIBLE_API_KEY` is
optional and is read from the environment; credentials must never be logged or
committed. Tests use only the configured endpoint and a fixed, non-sensitive
prompt. CI must not download models or contact an endpoint by default.

No live endpoint result is recorded yet. Unit tests, mocks, or a passing build
do not satisfy that evidence requirement.
