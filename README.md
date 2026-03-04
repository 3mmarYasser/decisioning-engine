# Decisioning Engine

A consent-safe personalisation decisioning engine built as a production-grade monorepo. Given a visitor, URL, and consent flags, the API returns the variant they should see — without cookies, without rebuilding, and with full respect for consent boundaries.

## Architecture

```
decisioning-engine/
├── apps/
│   ├── api/            NestJS decisioning API (port 4000)
│   └── web/            Next.js demo UI (port 3000)
├── packages/
│   ├── shared-types/   Shared TypeScript interfaces
│   └── eslint-config/  Shared ESLint configuration
├── docker-compose.yml
├── Dockerfile.api / Dockerfile.web
└── turbo.json
```

**Monorepo**: Turborepo + pnpm workspaces. Shared types are consumed by both apps via `@decisioning/shared-types`.

### Rule Engine

A priority-based, declarative rule engine. Rules are evaluated top-to-bottom by priority; the first matching rule wins, otherwise the fallback variant is returned. Each rule has AND-combined conditions (`eq`, `in`, `contains` operators).

Example rules for `site-abc`:

| Priority | Conditions | Variant |
|----------|-----------|---------|
| 1 | `country=DE AND language=de` | German locale variant |
| 2 | `deviceType=mobile` | Mobile-optimised variant |
| 3 | `referrerDomain contains google` | SEO/Google variant |
| — | *(fallback)* | Default variant |

### Consent Boundary

When `consent.marketing === false`, the visitor context is **stripped** before rule evaluation — only `{ country, language, deviceType, referrerDomain }` are allowed through. `visitorId` and all other PII/tracking attributes are removed. This is enforced at the service layer, not the transport layer, ensuring no leakage regardless of how the engine is invoked.

### Caching Strategy

The `GET /config/:siteId` endpoint implements a multi-layer caching strategy:

- **ETag**: SHA-256 hash of the response body. When the client sends `If-None-Match` with a matching ETag, the server responds with `304 Not Modified`, saving bandwidth.
- **Cache-Control**: `public, max-age=60, s-maxage=300, stale-while-revalidate=60`
  - **Browser** caches for 60 seconds (`max-age`).
  - **CDN/edge** (Cloudflare, Vercel Edge, CloudFront) caches for 5 minutes (`s-maxage`), serving requests without hitting origin.
  - **Stale-while-revalidate** allows serving a stale response for up to 60 seconds while asynchronously refreshing in the background, eliminating latency spikes during cache misses.
- **Redis (L2)**: Rulesets are cached in Redis with a 5-minute TTL, protecting origin from repeated disk/DB reads. If Redis is unavailable, the API falls back to in-memory caching.

### LLM Copy Assistant

The copy assistant uses **OpenAI GPT-4o** with tool/function calling:

1. The model is provided a `get_allowed_claims` tool that returns pre-approved marketing claims.
2. The model outputs structured JSON: `{ headline1, headline2, usedClaimIds }`.
3. **Validation**: `usedClaimIds ⊆ allowedClaims` is verified server-side. If invalid, the model is retried **once** with error feedback. If still invalid, a safe fallback is returned.
4. **Input sanitisation**: `tone` and `targetAudience` are validated against allowlists before being interpolated into prompts, preventing prompt injection.

### Logging, Tracing & Safety

Every LLM call produces a structured trace log: `{ requestId, model, inputTokens, outputTokens, latencyMs, validationPassed, retryCount }`. This enables:

- **Cost tracking** per request via token counts.
- **Latency monitoring** to detect API degradation.
- **Safety audit trail** — every generation is logged with its validation result and retry count, making it easy to flag hallucinated claims.

In production, these traces would feed into **OpenTelemetry** or **Datadog APM** for dashboards, alerting, and compliance auditing.

---

## Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 9.x (`corepack enable && corepack prepare pnpm@9.15.4 --activate`)
- **Docker** & **Docker Compose** (for containerised run)
- **OpenAI API key** (for the LLM copy assistant feature)

## Quick Start

### Local Development

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment variables
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# Edit apps/web/.env and add your OPENAI_API_KEY

# 3. Start Redis (if not using Docker Compose)
docker run -d --name redis -p 6379:6379 redis:7-alpine

# 4. Run both apps in dev mode
pnpm dev
```

- **API**: http://localhost:4000
- **Swagger Docs**: http://localhost:4000/api/docs
- **Web UI**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin

### Docker Compose

```bash
# Build and start all services (Redis + API + Web)
export OPENAI_API_KEY=sk-your-key-here
docker compose up --build
```

## Running Tests

```bash
# From root — runs tests in all workspaces
pnpm test

# Or specifically for the API
cd apps/api && pnpm test
```

The test suite includes:

1. **Rule matching**: Verifies that a German locale visitor (country=DE, language=de) receives the correct variant.
2. **Consent boundary**: Proves that two visitors with identical safe fields but different `visitorId` values receive the same variant when `marketing=false`, demonstrating that `visitorId` has no effect on decisions.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/config/:siteId` | Returns ruleset config (ETag + Cache-Control) |
| `POST` | `/decide` | Returns personalised variant decision |
| `POST` | `/api/llm` | LLM copy assistant (Next.js server route) |

Full interactive API docs at **http://localhost:4000/api/docs** (Swagger UI).

## Environment Variables

### API (`apps/api/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_HOST` | `localhost` | Redis hostname |
| `REDIS_PORT` | `6379` | Redis port |
| `PORT` | `4000` | API server port |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed CORS origin |

### Web (`apps/web/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | API URL for the frontend |
| `OPENAI_API_KEY` | — | OpenAI API key for LLM copy assistant |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Turborepo + pnpm |
| API | NestJS 10 |
| Frontend | Next.js 15 (App Router) |
| Cache | Redis 7 |
| LLM | OpenAI GPT-4o |
| API Docs | @nestjs/swagger |
| Styling | Tailwind CSS |
| Testing | Jest |
| Containers | Docker Compose |
