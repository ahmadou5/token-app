import type { IntentGoal, IntentRiskCheck, RiskProfile } from "@/types/intent";

interface RiskInput {
  amountUi: number;
  slippagePercent: number;
  priceImpactPercent: number;
  goal: IntentGoal;
  riskProfile: RiskProfile;
}

const BASE_LIMITS = {
  conservative: { maxSlippage: 0.5, maxPriceImpact: 0.75, maxPositionUi: 1_000 },
  balanced: { maxSlippage: 1.0, maxPriceImpact: 1.5, maxPositionUi: 5_000 },
  aggressive: { maxSlippage: 2.0, maxPriceImpact: 3.0, maxPositionUi: 20_000 },
} as const;

function goalMultiplier(goal: IntentGoal): number {
  if (goal === "momentum_trade_risk_cap") return 1.25;
  if (goal === "stable_yield_cap_drawdown") return 0.85;
  return 1;
}

export function runRiskChecks(input: RiskInput): IntentRiskCheck[] {
  const limits = BASE_LIMITS[input.riskProfile];
  const multiplier = goalMultiplier(input.goal);

  const checks: IntentRiskCheck[] = [
    {
      key: "slippage",
      pass: input.slippagePercent <= limits.maxSlippage * multiplier,
      message: "Requested slippage is within profile threshold",
      actual: input.slippagePercent,
      limit: Number((limits.maxSlippage * multiplier).toFixed(2)),
    },
    {
      key: "price_impact",
      pass: input.priceImpactPercent <= limits.maxPriceImpact * multiplier,
      message: "Estimated price impact is within profile threshold",
      actual: input.priceImpactPercent,
      limit: Number((limits.maxPriceImpact * multiplier).toFixed(2)),
    },
    {
      key: "position_size",
      pass: input.amountUi <= limits.maxPositionUi,
      message: "Position size is within profile cap",
      actual: input.amountUi,
      limit: limits.maxPositionUi,
    },
  ];

  return checks;
}

export function isBlocked(riskChecks: IntentRiskCheck[]): boolean {
  return riskChecks.some((check) => !check.pass);
}
