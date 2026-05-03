"use client";

import { useMemo, useState } from "react";
import { useWallet } from "@solana/connector";
import { useSwapSettings } from "@/context/SwapSettingsContext";
import { useIntentPlanner } from "@/hooks/useIntentPlanner";
import { trackEvent } from "@/lib/analytics";
import type { IntentGoal, RiskProfile } from "@/types/intent";

const GOALS: Array<{ key: IntentGoal; label: string }> = [
  { key: "grow_sol_low_risk", label: "Grow SOL (Low Risk)" },
  { key: "stable_yield_cap_drawdown", label: "Stable Yield (Capped Risk)" },
  { key: "momentum_trade_risk_cap", label: "Momentum Trade (Risk Cap)" },
];

const RISK_LEVELS: RiskProfile[] = ["conservative", "balanced", "aggressive"];

interface GoalModeCardProps {
  inputMint: string;
  outputMint: string;
  inputAmount: string;
}

export function GoalModeCard({ inputMint, outputMint, inputAmount }: GoalModeCardProps) {
  const { account } = useWallet();
  const { settings } = useSwapSettings();
  const { plan, status, error, previewIntent } = useIntentPlanner();

  const [goal, setGoal] = useState<IntentGoal>("grow_sol_low_risk");
  const [riskProfile, setRiskProfile] = useState<RiskProfile>("balanced");
  const [executeMsg, setExecuteMsg] = useState<string | null>(null);

  const canPreview = useMemo(() => {
    const n = parseFloat(inputAmount);
    return Boolean(inputMint && outputMint && n > 0);
  }, [inputAmount, inputMint, outputMint]);

  async function handlePreview() {
    if (!canPreview) return;

    trackEvent("intent_opened", { goal, riskProfile });

    const result = await previewIntent({
      owner: account ?? undefined,
      inputMint,
      outputMint,
      inputAmountUi: inputAmount,
      provider: settings.provider,
      slippagePercent: settings.slippage,
      goal,
      riskProfile,
    });

    if (result) {
      trackEvent("intent_preview_ready", {
        goal,
        blocked: result.blocked,
        checks: result.riskChecks.length,
      });
    }
  }

  async function handleExecute() {
    if (!plan || !account || plan.blocked) return;
    setExecuteMsg(null);

    const res = await fetch("/api/strategy/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner: account, plan, dryRun: true }),
    });
    const data = (await res.json()) as {
      ok: boolean;
      executionId?: string;
      err?: string;
    };

    if (!res.ok || !data.ok) {
      setExecuteMsg(data.err ?? "Execution preparation failed");
      return;
    }

    setExecuteMsg(`Execution queued: ${data.executionId}`);
    trackEvent("intent_execute_prepared", { executionId: data.executionId });
  }

  return (
    <div className="goal-card">
      <div className="goal-card__head">
        <h4>Goal Mode</h4>
        <span>Intent-driven strategy planning</span>
      </div>

      <div className="goal-card__controls">
        <select
          className="goal-card__select"
          value={goal}
          onChange={(e) => setGoal(e.target.value as IntentGoal)}
        >
          {GOALS.map((g) => (
            <option key={g.key} value={g.key}>
              {g.label}
            </option>
          ))}
        </select>

        <select
          className="goal-card__select"
          value={riskProfile}
          onChange={(e) => setRiskProfile(e.target.value as RiskProfile)}
        >
          {RISK_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="goal-card__btn"
          disabled={!canPreview || status === "loading"}
          onClick={handlePreview}
        >
          {status === "loading" ? "Building plan..." : "Preview Plan"}
        </button>
      </div>

      {error && <p className="goal-card__err">{error}</p>}

      {plan && (
        <div className="goal-card__plan">
          <p className="goal-card__summary">
            Risk checks: {plan.riskChecks.filter((c) => c.pass).length}/{plan.riskChecks.length}
            {plan.blocked ? " (blocked)" : " (ready)"}
          </p>
          <ul>
            {plan.steps.map((step) => (
              <li key={step.id}>
                <strong>{step.title}</strong>
                <span>{step.description}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="goal-card__btn goal-card__btn--secondary"
            disabled={plan.blocked || !account}
            onClick={handleExecute}
          >
            Prepare Execution
          </button>
          {executeMsg && <p className="goal-card__summary">{executeMsg}</p>}
        </div>
      )}
    </div>
  );
}
