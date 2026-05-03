export type IntentGoal = "grow_sol_low_risk" | "stable_yield_cap_drawdown" | "momentum_trade_risk_cap";

export type RiskProfile = "conservative" | "balanced" | "aggressive";

export interface IntentRequest {
  owner?: string;
  inputMint: string;
  outputMint: string;
  inputAmountUi: string;
  inputDecimals?: number;
  provider: "metis" | "titan";
  slippagePercent: number;
  goal: IntentGoal;
  riskProfile: RiskProfile;
}

export interface IntentRiskCheck {
  key: string;
  pass: boolean;
  message: string;
  actual?: number;
  limit?: number;
}

export interface IntentStep {
  id: string;
  kind: "swap" | "earn" | "stake" | "rebalance";
  title: string;
  description: string;
  protocol: string;
  action: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface IntentPlan {
  id: string;
  goal: IntentGoal;
  riskProfile: RiskProfile;
  provider: "metis" | "titan";
  inputMint: string;
  outputMint: string;
  inputAmountUi: string;
  expectedOutputUi: string;
  expectedPriceImpactPercent: number;
  route: string[];
  riskChecks: IntentRiskCheck[];
  blocked: boolean;
  steps: IntentStep[];
  createdAt: string;
}

export interface IntentQuoteResponse {
  ok: boolean;
  plan?: IntentPlan;
  err?: string;
}
