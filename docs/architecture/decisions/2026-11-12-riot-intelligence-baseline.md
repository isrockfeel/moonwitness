# ADR: RIOT Intelligence — Architecture Baseline

**Status:** Accepted  
**Date:** 2026-11-13
**Deciders:** MoonWitness Engineering Team

This ADR records architectural direction. It does not claim that the planned
runtime adapter, API routes, SSRF controls, persistence, or operator UI have
already shipped.

## Context

MoonWitness needs a local-first AI inference capability (RIOT Intelligence) that:

- Runs on user-controlled infrastructure.
- Exposes provider-neutral contracts for future runtimes.
- Keeps model weights and inference execution outside the Fastify process.
- Integrates with MoonWitness's server-side authentication and authorization.

Relevant repository state on `dev` at the time of this reconciliation:

- `apps/api/` is the Fastify application and existing product API boundary.
- `apps/web/` is the Next.js product UI.
- `packages/ai/` contains provider-neutral types, schemas, errors, and an
  Ollama adapter placeholder. The adapter does not yet implement inference.
- `packages/orm/` and `packages/schema/` are existing persistence components;
  their presence alone does not establish that RIOT configuration or usage
  persistence is ready.
- API composition and addon infrastructure are existing repository
  mechanisms. RIOT-specific API routes and persistence are not yet delivered
  on `dev`.

## Decision

### 1. Package Structure

- `packages/ai` is the provider-neutral contract and adapter boundary.
- Its current package exports include `types`, `schemas`, `errors`, and
  `adapters/ollama`.
- Product inference requests must flow through `apps/api`. The web app may
  consume API response types, but must not import or call provider adapters.
- Vendor-specific SDK types do not belong in domain contracts.

### 2. API Boundary

- Fastify remains the single product API boundary (`apps/api`).
- Proposed routes under `/api/v1/ai/*` must use verified server-side identity
  and authorization when implemented. No RIOT inference route is currently
  shipped on `dev`.
- No separate AI gateway service is needed for the first milestone.

### 3. Local Inference Runtime

- Model execution remains an external HTTP runtime, not part of the Fastify
  process.
- The runtime endpoint must be configured and controlled server-side; clients
  must never submit an upstream URL.
- The exact configuration and network enforcement mechanism remains to be
  implemented and security-tested. An environment allowlist by itself is not
  evidence that DNS rebinding, redirects, or private-network access are
  prevented.
- The first adapter will use the OpenAI-compatible HTTP API only, centered on
  `GET /v1/models` and `POST /v1/chat/completions` with SSE streaming. Provider-
  native endpoints such as Ollama `/api/*` are out of scope.
- Ollama's `/v1`, llama.cpp server, and vLLM are candidate runtimes exposing the
  same protocol; runtime-specific behavior still needs validation. No recorded
  real-runtime result was found, so compatibility remains unverified.

### 4. Security and Privacy Requirements

- **SSRF:** Enforce destination policy at connection time, including redirects,
  DNS resolution, private and link-local ranges, and cloud metadata addresses.
  This is a requirement, not a shipped control.
- **Identity and authorization:** Derive identity from a verified server-side
  session and enforce permissions at the API boundary.
- **Prompt data:** Do not log raw prompts or completions by default. Audit only
  the metadata needed for operations and security.
- **Secrets:** Never include provider secrets in prompts, browser responses, or
  ordinary audit records.
- **Tenant isolation:** Enforce authorization and ownership server-side.
  Placing the model server outside the API process does not provide tenant
  isolation by itself.
- **Cloud routing:** Do not fall back to a cloud provider unless a future
  explicit policy is approved.
- **Model output:** Treat output as untrusted data. Input validation and audit
  logging do not solve prompt injection; features that consume model output as
  instructions require their own controls.

### 5. Non-Goals for the First Milestone

- Multi-provider orchestration or automatic cloud fallback.
- A second API gateway or in-process model execution.
- Embeddings or model-server administration unless separately specified.
- Exposing arbitrary runtime endpoints, shell execution, or filesystem access.

## Consequences

- `packages/ai` is the source of truth for provider-neutral AI contracts.
- `apps/api` will compose inference routes and enforce authentication,
  authorization, validation, limits, and audit when that integration is built.
- `apps/web` consumes secured product API operations only; it does not call
  model runtimes directly.
- Future providers require separate adapters that implement the shared
  contracts.
- Readiness, security, persistence, and compatibility remain unproven until
  their implementation issues have direct test and runtime evidence.

## Implementation Status and Evidence

| Area                        | Verified status                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Provider-neutral contracts  | Implemented in `packages/ai`, merged by PR #49. CI passed for PR head `2170b7cc06c0fd4d039ae7b38e712f382a3eaf0e`.         |
| Protocol validation | Issue #30 now scopes validation to OpenAI-compatible `/v1/*`; no live result is recorded. |
| Ollama adapter              | Placeholder only: `listModels` returns an empty list and chat/stream methods are not implemented. Issue #31 remains open. |
| Fastify inference API       | No RIOT inference routes are shipped on `dev`. Issue #32 remains open.                                                    |
| Authentication              | PR #51 has passing CI but remains unmerged; issue #5 remains open.                                                        |
| Persistence and operator UX | Not delivered for RIOT Intelligence; issues #33 and #34 remain open.                                                      |

## OpenAI-Compatible Protocol Scope

- The protocol boundary is the OpenAI-compatible API only: model listing,
  chat completions, SSE streaming, and documented optional fields.
- OpenAI-compatible servers may differ in tool calls, usage reporting, finish
  reasons, and error formats. These are to be measured per runtime rather than
  assumed from the protocol name.
- The previous protocol tests exercised provider-native `/api/*` endpoints and
  did not validate the selected protocol. They have been replaced with
  OpenAI-compatible opt-in tests; no live result is claimed.
- Issue #30 tracks opt-in, explicitly configured tests and a reproducible
  compatibility record. No live endpoint result is currently claimed.

## Links

- PR #49: `@moonwitness/ai` contracts package (Issue #29)
- PR #52: original ADR; this revision reconciles its claims
- Issue #30: OpenAI-compatible protocol validation only
- Issue #5: server-side authentication and RBAC (PR #51)
- Issue #30: protocol validation
- Issue #31: local inference adapter
- Issue #32: secure Fastify integration
- Issue #33: persistence
- Issue #34: operator UX
