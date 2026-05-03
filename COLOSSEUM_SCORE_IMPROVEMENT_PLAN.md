# Colosseum Score Improvement Plan

Date: 2026-05-03
Current crowdedness signal: ~255/500 (moderately crowded)
Product baseline: Solana super app with spot swap, perps, staking, and earn.

## Objective

Improve your Colosseum positioning by moving from a generic "trading super app" into a sharper wedge with clear differentiation, stronger user outcomes, and better proof of execution.

## What To Add (Highest Impact First)

1. Intent-Based "Goal Mode" (differentiate from generic DEX UI)
- Add user intents like:
  - "Grow SOL with low risk"
  - "Earn stable yield with max drawdown limit"
  - "Trade momentum with risk cap"
- System composes actions across swap + earn + staking automatically.
- Why this helps: shifts your tag profile from "another trading UI" to "automation + outcomes."

2. Unified Risk Layer Across All Actions
- Add a shared risk engine for:
  - position sizing caps
  - slippage/volatility guards
  - max loss and liquidation proximity alerts
- Apply before swap/perp/earn transactions are executed.
- Why this helps: winners often present safety and reliability as a core product primitive.

3. One-Click Strategy Vaults (Execution Recipes)
- Create reusable strategy templates:
  - "SOL accumulator"
  - "Stable carry"
  - "Perp hedge + yield collateral"
- Include expected APY/risk band and required capital.
- Why this helps: concrete user outcomes are stronger than feature lists.

4. Wallet Intelligence + Auto-Rebalancing
- Detect idle balances and recommend/auto-apply reallocation rules.
- Weekly rebalance policies with user-defined thresholds.
- Why this helps: increases engagement and "active management" retention KPI.

5. Verifiable Performance Feed
- Add transparent strategy performance:
  - realized vs projected yield
  - win/loss and drawdown for strategy actions
  - transaction-level attribution
- Why this helps: credibility and "proof of value" are strong in judging and user trust.

## Execution Plan

## Phase 1 (Week 1-2): Product Wedge + Data Model

Deliverables:
- Define 3 initial intents and their decision logic.
- Add strategy and risk schemas in `types/` and `lib/`.
- Add backend endpoints for previewing suggested action plans.

Implementation tasks:
- Create `types/intent.ts` and `types/strategy.ts`.
- Add `lib/riskEngine.ts` with pre-trade checks.
- Add `app/api/intent/quote/route.ts` to return multi-step plan previews.
- Add event logging for recommendations accepted/rejected.

Primary KPI:
- `% of active wallets that open intent flow`.

## Phase 2 (Week 3-4): MVP Automation and One-Click Execution

Deliverables:
- Execute composed transactions from one intent.
- Add 2-3 strategy vault presets.
- Add confirmation UX showing full planned route and risk checks.

Implementation tasks:
- Extend swap execution flow in hooks to support chained actions.
- Add `app/api/strategy/execute/route.ts`.
- Build UI module under `components/Strategy/`.
- Add fail-safe rollback behavior and explicit user confirmations.

Primary KPI:
- `weekly wallets completing >=1 intent/strategy execution`.

## Phase 3 (Week 5): Auto-Rebalance + Alerts

Deliverables:
- Rule-based rebalance settings.
- Notifications/alerts for risk threshold breaches.
- Portfolio health score in drawer/dashboard.

Implementation tasks:
- Add rebalance config state in `context/`.
- Add `app/api/portfolio/rebalance/route.ts`.
- Add alert center component and threshold editor UI.

Primary KPI:
- `7-day retention of wallets that enabled rebalancing`.

## Phase 4 (Week 6): Performance Proof + Submission Readiness

Deliverables:
- Public/internal analytics page with strategy outcomes.
- "Why this strategy" explanation panel with transparent metrics.
- Colosseum submission narrative artifacts (demo flow + screenshots + KPI snapshot).

Implementation tasks:
- Add `app/(app)/analytics/page.tsx`.
- Add strategy metrics aggregation service in `lib/services/`.
- Instrument funnel metrics for intent -> preview -> execute -> retained.

Primary KPI:
- `intent funnel completion rate` and `week-4 retained strategy users`.

## KPI Stack (Single Primary + Supporting)

Primary KPI:
- Weekly Active Outcome Wallets (WAOW)
- Definition: wallets that complete at least 1 intent-driven strategy action per week.

Supporting KPIs:
- Intent open rate
- Intent to execution conversion
- 7-day retention after first strategy execution
- Median time from intent creation to confirmed tx
- Net deposited value into strategies

## Expected Colosseum Impact

If implemented, your positioning should move from:
- "Crowded trading super app"
to:
- "Intent-driven risk-managed wealth automation on Solana."

This should improve your competitiveness by:
- reducing direct overlap with generic DEX/perps entries,
- increasing uniqueness of primitives (automation + risk orchestration + transparent outcomes),
- improving judging narrative with measurable user-value loops.

## Immediate Next Build Tickets

1. Create `types/intent.ts`, `types/strategy.ts`, and `lib/riskEngine.ts`.
2. Ship `POST /api/intent/quote` returning multi-step action plans.
3. Build a minimal "Goal Mode" UI entry point on home/app screen.
4. Track analytics events for open, preview, execute, and completion.

