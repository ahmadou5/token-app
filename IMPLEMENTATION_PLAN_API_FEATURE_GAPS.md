# API + Feature Gap Plan (Solana Kit/Connector/Pipeit)

Date: 2026-05-07

## Scope
Close remaining API/feature gaps where frontend can show stale placeholders, non-verifiable values, or inconsistent contracts.

## Current Status (Verified)

### Completed
1. Home API routes are service-backed (no route-level hardcoded mocks):
- `app/api/home/stats/route.ts`
- `app/api/home/prices/route.ts`
- `app/api/home/markets/route.ts`

2. Portfolio yield UI is implemented with real list rendering and empty states:
- `components/Portfolio/PortfolioDrawer.tsx`
- `hooks/usePortfolioData.ts`

3. Missing perp positions route exists and is consumed by portfolio:
- `app/api/trade/route.ts`

4. Yield quote route supports real provider-specific transaction paths for active providers:
- `app/api/yield/quote/route.ts`

### Remaining Gaps
1. Home stats fallback currently returns synthetic values when upstream data is unavailable.
2. Yield position attribution and estimated yield still rely on heuristic logic for some tokens.
3. API contract keys are inconsistent across routes (`error` vs `err`, envelope differences).
4. Tests do not yet cover all home/trade/yield failure scenarios.

## Ordered Execution Plan

### 1. Plan/Status Accuracy
- Keep this file updated as implementation changes land.
- Ensure every listed gap maps to a concrete file and acceptance criteria.

Acceptance:
- No stale claims in this document.

### 2. Home Route Fallback Hardening
Ownership:
- `lib/services/homeData.service.ts`
- `app/api/home/stats/route.ts`
- `app/api/home/prices/route.ts`
- `app/api/home/markets/route.ts`

Tasks:
- Replace synthetic stats fallback with deterministic empty-safe values and stale metadata.
- Return consistent envelope shape for home routes.
- Preserve graceful rendering behavior for frontend.

Acceptance:
- No fake numeric market stats in failure path.
- Responses include explicit stale/error indicator.

### 3. Yield Position Accuracy Hardening
Ownership:
- `lib/services/yield.service.ts`
- `app/api/yield/positions/route.ts`

Tasks:
- Remove symbol-prefix provider detection heuristics.
- Keep only provider-attribution paths with deterministic evidence (protocol adapters and allowlists).
- Keep paused providers excluded from active attribution.

Acceptance:
- No heuristic provider classification based on token ticker prefix.
- Yield positions are sourced from protocol/account evidence only.

### 4. API Contract Normalization
Ownership:
- API routes under `app/api/*` touched by this plan.

Tasks:
- Normalize response shape to:
  - success: `{ ok: true, data: ..., err: null }` (or domain key like `quote`/`positions` while keeping `ok` + `err`)
  - failure: `{ ok: false, err: string, ...safe-defaults }`
- Avoid mixing `error` and `err` keys.

Acceptance:
- All touched routes use consistent `ok` + `err` semantics.

### 5. Reliability + Regression Tests
Ownership:
- `tests/api-routes.test.ts`
- Additional tests under `tests/` as needed.

Tasks:
- Add contract tests for:
  - `/api/home/stats`, `/api/home/prices`, `/api/home/markets`
  - `/api/trade`
  - `/api/yield/quote` paused/unsupported/failure paths
- Add failure/timeout-safe behavior tests.

Acceptance:
- `pnpm test` passes.
- Coverage includes success + validation + failure paths for the above routes.

## Definition of Done
1. No stale or misleading plan/status documentation.
2. No synthetic market metrics used as fallback values.
3. No heuristic-only provider attribution for yield positions.
4. Touched routes follow consistent `ok`/`err` contract semantics.
5. Route-level tests cover both happy and failure paths.
