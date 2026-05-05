# API + Feature Gap Plan (Solana Kit/Connector/Pipeit)

## Scope
Audit and close gaps where frontend shows placeholders, non-fetched data, or routes that are missing/unimplemented.

## Confirmed Gaps (Current State)
1. `app/api/home/stats/route.ts`
- Returns hardcoded mock stats (`tvl`, `volume24h`, `activeUsers`).

2. `app/api/home/prices/route.ts`
- Returns hardcoded mock perp prices.

3. `app/api/home/markets/route.ts`
- Returns hardcoded token/category market arrays.

4. `app/api/yield/positions/route.ts`
- Returns empty/mock positions with TODO for real vault integration.

5. `components/Portfolio/PortfolioDrawer.tsx`
- Yield section is an explicit placeholder UI, not real position data.

6. `hooks/usePortfolioData.ts`
- Depends on `/api/trade?wallet=...` for perp positions.
- Route was missing before this pass; now implemented as `app/api/trade/route.ts`.

7. `app/api/yield/quote/route.ts`
- Previously returned placeholder base64 transaction.
- Now changed to informational quote only (`transaction: null`), execution disabled until real integration.

8. `hooks/useEarnPositions.ts`
- Contained unimplemented dead code path; now cleaned up and state reset behavior improved.

## Fixes Applied In This Pass
1. Added missing perp positions route:
- `app/api/trade/route.ts`
- Uses `lib/adrena.ts:getPositions()` and returns normalized `openPositions`.

2. Hardened earn positions hook:
- `hooks/useEarnPositions.ts`
- Removed dead unimplemented callback, added safe array guards, clears stale positions on disconnect.

3. Removed fake executable yield tx response:
- `app/api/yield/quote/route.ts`
- Returns `transaction: null`, `executionAvailable: false`, and note for UI/flow correctness.

## Multi-Agent Implementation Plan

## Branch/PR Strategy
1. Create one integration branch: `feat/close-api-feature-gaps`.
2. Each agent works in a dedicated sub-branch and opens PR to integration branch.
3. Keep file ownership disjoint to avoid merge conflicts.

## Agent Workstreams
1. Agent A: Home Data APIs (read-only market data)
- Ownership:
  - `app/api/home/stats/route.ts`
  - `app/api/home/prices/route.ts`
  - `app/api/home/markets/route.ts`
  - `components/home/HeroSection.tsx`
  - `components/home/TradingSection.tsx`
- Tasks:
  - Replace mock data with live upstream fetches.
  - Add timeout + fallback + stale-safe shape validation.
  - Keep response contracts stable for existing FE.
- Acceptance:
  - No hardcoded market metrics.
  - FE displays real data with graceful fallback state.

2. Agent B: Yield Positions + Portfolio Yield UI
- Ownership:
  - `app/api/yield/positions/route.ts`
  - `hooks/useEarnPositions.ts` (follow-up only if needed)
  - `hooks/usePortfolioData.ts`
  - `components/Portfolio/PortfolioDrawer.tsx`
- Tasks:
  - Integrate provider adapters for real wallet positions.
  - Add yield positions into portfolio aggregate hook.
  - Replace Yield placeholder card with real rows + empty/error states.
- Acceptance:
  - Connected wallet with active vault position shows real amount/yield.
  - No placeholder-only Yield block.

3. Agent C: Yield Execution Wiring (solana/kit + pipeit)
- Ownership:
  - `app/api/yield/quote/route.ts`
  - `hooks/useVaultQuote.ts`
  - `hooks/useEarnExecute.ts`
  - `components/Earn/EarnVault.tsx`
- Tasks:
  - Implement real tx construction path (provider-aware).
  - Keep transaction signing/execution via `@solana/connector` + `@pipeit/core`.
  - Add capability flag per provider (`executionAvailable`), disable submit when unavailable.
- Acceptance:
  - At least one provider supports live deposit/withdraw tx end-to-end.
  - No fake transaction payloads.

4. Agent D: Reliability + Tests
- Ownership:
  - `tests/api-routes.test.ts`
  - New tests under `tests/` for home/yield/trade routes
- Tasks:
  - Add route contract tests for success/failure/invalid params.
  - Add regression tests for missing route and null-transaction safety.
- Acceptance:
  - `pnpm test` passes with new coverage for all touched endpoints.

## Engineering Standards (Must Follow)
1. Wallet/connectivity:
- Use `@solana/connector` hooks for account/signer/client only.

2. Transaction execution:
- Use `@pipeit/core` `TransactionBuilder` pattern.
- Keep signing through connector signer, no ad-hoc wallet adapters.

3. Solana primitives:
- Use `@solana/kit` types/helpers where possible for address/instruction handling.

4. API hardening:
- Validate required params.
- Return stable JSON contracts: `{ ok, data|quote|positions, err|error }`.
- Add timeout and failure-safe fallbacks for external providers.

## Sequencing
1. Merge Agent A first (home data quality, low coupling).
2. Merge Agent B second (portfolio/yield visibility).
3. Merge Agent C third (yield execution path).
4. Merge Agent D last (tests after contracts settle).

## Definition of Done
1. No mock-only API responses in home and yield routes.
2. No placeholder-only portfolio yield UI.
3. No missing FE-called routes.
4. At least one live earn execution path works via connector + pipeit.
5. Tests cover route contracts and failure paths.
