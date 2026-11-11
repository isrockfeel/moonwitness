# Deployment

## Status: contract defined, target not configured

`.github/workflows/deploy.yml` implements the production deploy contract. It has never run
successfully, because this repository has no hosting target and no deployment credentials. The
workflow fails loudly and tells you exactly what is missing instead of reporting a green deploy
that deployed nothing.

## What the workflow does

1. Resolves the release tag (from the `release: published` event, or the manual `tag` input).
2. Verifies `DEPLOY_HOOK_URL` (secret) and `HEALTHCHECK_URL` (variable) exist; fails with a list of
   what is missing otherwise.
3. Checks out the release tag — never a branch head.
4. `POST`s `{"ref": "<tag>", "sha": "<sha>"}` to `DEPLOY_HOOK_URL` and fails on any non-2xx.
5. Polls `HEALTHCHECK_URL` up to ten times, 15 seconds apart, and fails unless it returns `200`.
6. Smoke-tests `PRODUCTION_URL` (variable) and requires `200`.

The job is bound to the `production` GitHub Environment, so required reviewers can gate it.

## Web → API deployment topology

The Next.js app proxies API calls through a rewrite so browsers talk to one origin. The rewrite
target is controlled by `API_INTERNAL_URL` on the web process (defaults to `http://localhost:3002`
for local dev):

- `apps/web/next.config.ts` maps `/api/v1/:path*` → `{API_INTERNAL_URL}/api/v1/:path*`.
- Set `API_INTERNAL_URL` to the Fastify API's reachable origin in each environment:
  - local dev: unset (uses `http://localhost:3002`).
  - staging/production: set it to the API service URL the web process can reach over the
    platform's private network (e.g. `http://api:3002` on a container network, or the internal
    load-balanced origin).

The API side controls its own bound host/port via `HOST`/`PORT` (defaults `127.0.0.1:3002`) and
exposes health/readiness under the API prefix (`/api/v1/healthz`, `/api/v1/readyz`).

## Required configuration

| Name              | Kind     | Purpose                                                 |
| ----------------- | -------- | ------------------------------------------------------- |
| `DEPLOY_HOOK_URL` | secret   | Hosting platform deploy hook (Vercel/Coolify/other)     |
| `HEALTHCHECK_URL` | variable | Endpoint that must return `200` when the app is serving |
| `PRODUCTION_URL`  | variable | Public root URL used by the smoke test                  |

Plus a platform manifest committed to the repo (`vercel.json`, Dockerfile, or the platform's
equivalent) so the build is reproducible outside a developer machine.

## Enabling it

1. Add the three values above in Settings → Secrets and variables → Actions.
2. Create the `production` Environment and add the owner as a required reviewer.
3. Run the workflow manually with a tag that exists (for example `v0.1.0`) and watch it pass.
4. Only then rely on `release: published` to trigger it automatically.

Until step 3 has actually succeeded, treat deployment as unverified.

## Rollback

A failed health check means the release is not serving. In order:

1. **Re-deploy the previous tag.** Run the Deploy workflow manually with the last known-good tag
   (`gh workflow run deploy.yml -f tag=v0.0.9`). This is the fastest path and does not require a
   revert commit.
2. **If the platform keeps per-deployment history**, promote the previous deployment in the
   platform UI instead; it is equivalent and faster.
3. **Only if a rollback tag does not exist**, revert the offending commit on `dev`, promote to
   `main` through a PR, and cut a new patch release. Do not force-push `main`; the ruleset blocks
   it.
4. **Record what happened** in the release notes of the replacement release, including the failed
   tag and the root cause.

Never delete or move a release tag to "undo" a deploy — the `release-tags` ruleset prevents it, and
a moved tag makes every past deploy unattributable.
