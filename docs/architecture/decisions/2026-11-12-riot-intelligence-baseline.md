# ADR: RIOT Intelligence — Architecture Baseline

**Status:** Accepted  
**Date:** 2026-11-12  
**Deciders:** MoonWitness Engineering Team

## Context

MoonWitness needs a local-first AI inference capability (RIOT Intelligence) that:

- Runs entirely on user-controlled infrastructure
- Exposes a provider-neutral API surface for future multi-provider support
- Keeps model weights and inference execution outside the Fastify process
- Integrates with existing MoonWitness auth/RBAC system (Issue #5)

Current state (from `dev` branch inspection):

- `apps/api/` — Fastify-based REST API with auth proxy to arsy control plane
- `apps/web/` — Next.js frontend with static Dock timeline component
- `packages/ai/` — Provider-neutral AI contracts (new, Issue #29/#30)
- `packages/orm/` + `packages/schema/` — Database layer with Kysely + LibSQL
- `apps/api/src/infrastructure/adapters/fastify.adapter.ts` — Fastify composition
- `packages/addons/` — Addon system (timeline, base, etc.)

## Decision

### 1. Package Structure

- New package `packages/ai` (already created in Issue #29/#30) hosts all provider-neutral contracts
- Exports: `types`, `schemas`, `errors`, `adapters/ollama`
- Dependency direction: `packages/ai` ← `apps/api` ← `apps/web` (web never imports `ai` directly)
- No vendor SDKs in domain contracts

### 2. API Boundary

- Fastify remains the single product API boundary (`apps/api`)
- New routes under `/api/v1/ai/*` with existing auth middleware
- No separate AI gateway service for MVP

### 3. Local Inference Runtime

- External HTTP runtime (Ollama native API at `/api/*`)
- Never in-process model execution
- Server-side allowlist of runtime endpoints via `ALLOWED_INFERENCE_HOSTS` env var
- First adapter target: **Ollama native API** (`/api/*`) — based on protocol tests showing full chat/streaming/tools support

### 4. Security / Threat Model

- SSRF: Server allowlists runtime endpoints (no client-supplied URLs)
- Prompt data: Not logged by default; actor+model audited only
- No secrets in prompts; runtime outside Fastify process
- Tenant isolation: Session-scoped, model server outside process
- No cloud fallback unless explicit policy approved

### 5. Non-Goals for First Milestone

- Multi-provider orchestration
- Cloud provider fallback
- Embeddings API
- Streaming to web (handled via existing SSE/WebSocket in Fastify)

## Consequences

- `packages/ai` is the single source of truth for AI contracts
- `apps/api` composes AI routes via existing Fastify composition
- `apps/web` consumes via existing TanStack Query patterns
- Future providers (OpenAI, Anthropic, etc.) add adapters without changing contracts

## Security / Threat Model Details

| Threat                 | Mitigation                                                  |
| ---------------------- | ----------------------------------------------------------- |
| SSRF via inference URL | Server allowlist via `ALLOWED_INFERENCE_HOSTS` env          |
| Local network pivot    | Runtime server outside Fastify process, no localhost access |
| Prompt injection       | Input validation, output sanitization, audit logging        |
| Data exfiltration      | No prompt logging by default; actor+model audited           |
| Tenant isolation       | Session-scoped, external runtime per tenant                 |

## Implementation Order

1. ✅ Issue #29: Provider-neutral contracts (`packages/ai`) — **Done** (PR #49)
2. ✅ Issue #30: Protocol validation spike (Ollama) — **Done** (PR #49)
3. 🔄 Issue #31: Local inference adapter implementation — Next
4. 🔄 Issue #32: Fastify integration with auth — Next
5. 🔄 Issue #5: Server-side auth + RBAC — In progress (PR #51)

## Validation

- Protocol spike (`packages/ai/src/adapters/ollama/protocol.test.ts`) validates:
  - Chat completion ✅
  - SSE streaming (NDJSON) ✅
  - Tool calling ❌ (not supported)
  - JSON mode ✅ (`format: "json"`)
  - Usage metadata ✅ (final chunk)
  - Model listing ✅ rich metadata via `/api/tags`
  - Cancellation ✅ via AbortSignal
- First adapter target selected: **Ollama native API** (`/api/*`)

## Links

- PR #49: `@moonwitness/ai` contracts package (Issues #29, #30)
- Issue #5: Server-side auth + RBAC (PR #51)
- Issue #7: Dock → real API data (in progress)
