import type { IntentGoal, RiskProfile } from "./intent";

export type StrategyTemplateId =
  | "sol_accumulator"
  | "stable_carry"
  | "perp_hedge_yield";

export interface StrategyTemplate {
  id: StrategyTemplateId;
  name: string;
  goal: IntentGoal;
  minCapitalUsd: number;
  estApyRange: { min: number; max: number };
  riskBand: RiskProfile;
  description: string;
}

export const STRATEGY_TEMPLATES: StrategyTemplate[] = [
  {
    id: "sol_accumulator",
    name: "SOL Accumulator",
    goal: "grow_sol_low_risk",
    minCapitalUsd: 50,
    estApyRange: { min: 4, max: 10 },
    riskBand: "conservative",
    description:
      "Swap into SOL gradually and pair with low-volatility staking/earn overlays.",
  },
  {
    id: "stable_carry",
    name: "Stable Carry",
    goal: "stable_yield_cap_drawdown",
    minCapitalUsd: 100,
    estApyRange: { min: 6, max: 14 },
    riskBand: "balanced",
    description:
      "Keep principal in stables and route deposits to best risk-adjusted yield vaults.",
  },
  {
    id: "perp_hedge_yield",
    name: "Perp Hedge + Yield",
    goal: "momentum_trade_risk_cap",
    minCapitalUsd: 250,
    estApyRange: { min: 8, max: 22 },
    riskBand: "aggressive",
    description:
      "Use capped-risk momentum entries and park idle collateral in yield strategies.",
  },
];
