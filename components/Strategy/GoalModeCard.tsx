"use client";

import { useMemo, useState } from "react";
import { useWallet } from "@solana/connector";
import { useSwapSettings } from "@/context/SwapSettingsContext";
import { useIntentPlanner } from "@/hooks/useIntentPlanner";
import { trackEvent } from "@/lib/analytics";
import type { IntentGoal, RiskProfile } from "@/types/intent";
import type { SwapQuote } from "@/hooks/useSwapQuote";

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
  quote: SwapQuote | null;
  onExecutePrimarySwap: () => Promise<string | null>;
}

export function GoalModeCard({
  inputMint,
  outputMint,
  inputAmount,
  quote,
  onExecutePrimarySwap,
}: GoalModeCardProps) {
  const { account } = useWallet();
  const { settings } = useSwapSettings();
  const { plan, status, error, previewIntent } = useIntentPlanner();

  const [goal, setGoal] = useState<IntentGoal>("grow_sol_low_risk");
  const [riskProfile, setRiskProfile] = useState<RiskProfile>("balanced");
  const [executionState, setExecutionState] = useState<"idle" | "running">("idle");
  const [executeMsg, setExecuteMsg] = useState<string | null>(null);

  const canPreview = useMemo(() => {
    const n = parseFloat(inputAmount);
    return Boolean(inputMint && outputMint && n > 0);
  }, [inputAmount, inputMint, outputMint]);

  const canExecute = Boolean(plan && !plan.blocked && quote && account && executionState === "idle");

  async function handlePreview() {
    if (!canPreview) return;

    setExecuteMsg(null);
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
    if (!plan || !account || !quote || plan.blocked) return;

    setExecutionState("running");
    setExecuteMsg("Validating plan...");

    const res = await fetch("/api/strategy/execute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner: account, plan, dryRun: false }),
    });

    const data = (await res.json()) as {
      ok: boolean;
      executionId?: string;
      err?: string;
    };

    if (!res.ok || !data.ok) {
      setExecutionState("idle");
      setExecuteMsg(data.err ?? "Plan validation failed");
      return;
    }

    setExecuteMsg("Executing step 1/1: signed swap transaction...");
    const signature = await onExecutePrimarySwap();

    if (!signature) {
      setExecutionState("idle");
      setExecuteMsg("Execution failed while submitting swap transaction.");
      return;
    }

    setExecutionState("idle");
    setExecuteMsg(`Executed successfully. Tx: ${signature.slice(0, 8)}...`);
    trackEvent("intent_execute_prepared", {
      executionId: data.executionId,
      txSignature: signature,
      mode: "live",
    });
  }

  return (
    <div className="sw-goal">
      <div className="sw-goal__head">
        <span className="sw-input-lbl">Goal Mode</span>
        <span className="sw-goal__hint">Outcome-first strategy planner</span>
      </div>

      <div className="sw-goal__controls">
        <select
          className="sw-goal__select"
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
          className="sw-goal__select"
          value={riskProfile}
          onChange={(e) => setRiskProfile(e.target.value as RiskProfile)}
        >
          {RISK_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
      </div>

      <div className="sw-goal__actions">
        <button
          type="button"
          className="sw-goal__btn"
          disabled={!canPreview || status === "loading"}
          onClick={handlePreview}
        >
          {status === "loading" ? "Building plan..." : "Preview Plan"}
        </button>
        <button
          type="button"
          className="sw-goal__btn sw-goal__btn--secondary"
          disabled={!canExecute}
          onClick={handleExecute}
        >
          {executionState === "running" ? "Executing..." : "Execute Plan"}
        </button>
      </div>

      {error && <div className="sw-error sw-goal__state">{error}</div>}

      {plan && (
        <div className="sw-quote sw-goal__quote">
          <div className="sw-quote__row">
            <span className="sw-quote__label">Risk checks</span>
            <span className={`sw-quote__val ${plan.blocked ? "sw-quote__val--warn" : ""}`}>
              {plan.riskChecks.filter((c) => c.pass).length}/{plan.riskChecks.length}
            </span>
          </div>
          <div className="sw-quote__row">
            <span className="sw-quote__label">Estimated steps</span>
            <span className="sw-quote__val">{plan.steps.length}</span>
          </div>
          <div className="sw-quote__row">
            <span className="sw-quote__label">Route</span>
            <span className="sw-quote__val sw-quote__val--route">{plan.route.join(" -> ")}</span>
          </div>
          <div className="sw-quote__row sw-quote__row--provider">
            <span className="sw-quote__label">Execution</span>
            <span className="sw-quote__provider">Uses current swap signer flow</span>
          </div>
        </div>
      )}

      {executeMsg && <div className="sw-success sw-goal__state">{executeMsg}</div>}
    </div>
  );
}
