"use client";

import { useMemo, useState } from "react";
import { useWallet } from "@solana/connector";
import { useSwapSettings } from "@/context/SwapSettingsContext";
import { useIntentPlanner } from "@/hooks/useIntentPlanner";
import { useStakeTransaction } from "@/hooks/useStakeTransaction";
import { useEarnExecute } from "@/hooks/useEarnExecute";
import { trackEvent } from "@/lib/analytics";
import { useAlertCenter } from "@/context/AlertCenterContext";
import type { IntentGoal, RiskProfile } from "@/types/intent";
import type { SwapQuote } from "@/hooks/useSwapQuote";

const GOALS: Array<{ key: IntentGoal; label: string }> = [
  { key: "grow_sol_low_risk", label: "Grow SOL (Low Risk)" },
  { key: "stable_yield_cap_drawdown", label: "Stable Yield (Capped Risk)" },
  { key: "momentum_trade_risk_cap", label: "Momentum Trade (Risk Cap)" },
];

const RISK_LEVELS: RiskProfile[] = ["conservative", "balanced", "aggressive"];
const SOL_MINT = "So11111111111111111111111111111111111111112";

type ValidatorRecord = {
  votingPubkey?: string;
  voteIdentity?: string;
  vote_identity?: string;
};

interface GoalModeCardProps {
  inputMint: string;
  outputMint: string;
  outputSymbol: string;
  inputAmount: string;
  quote: SwapQuote | null;
  onExecutePrimarySwap: () => Promise<string | null>;
}

function getDecimals(symbol: string, mint: string): number {
  if (mint === SOL_MINT) return 9;
  if (symbol === "USDC" || symbol === "USDT") return 6;
  return 9;
}

export function GoalModeCard({
  inputMint,
  outputMint,
  outputSymbol,
  inputAmount,
  quote,
  onExecutePrimarySwap,
}: GoalModeCardProps) {
  const { account } = useWallet();
  const { settings } = useSwapSettings();
  const { plan, status, error, previewIntent } = useIntentPlanner();
  const { executeStakeAction } = useStakeTransaction();
  const { execute: executeEarn } = useEarnExecute();
  const { addAlert } = useAlertCenter();

  const [goal, setGoal] = useState<IntentGoal>("grow_sol_low_risk");
  const [riskProfile, setRiskProfile] = useState<RiskProfile>("balanced");
  const [executionState, setExecutionState] = useState<"idle" | "running">("idle");
  const [executeMsg, setExecuteMsg] = useState<string | null>(null);
  const [lastExecution, setLastExecution] = useState<{
    swapTx: string;
    step2Tx: string | null;
    step2Label: string | null;
  } | null>(null);

  const canPreview = useMemo(() => {
    const n = parseFloat(inputAmount);
    return Boolean(inputMint && outputMint && n > 0);
  }, [inputAmount, inputMint, outputMint]);

  const canExecute = Boolean(plan && !plan.blocked && quote && account && executionState === "idle");

  async function handlePreview() {
    if (!canPreview) return;

    setExecuteMsg(null);
    setLastExecution(null);
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

  async function chainStakeStep(): Promise<string | null> {
    if (!quote) return null;
    if (outputMint !== SOL_MINT) return null;

    setExecuteMsg("Executing step 2: selecting validator...");

    const validatorsRes = await fetch("/api/validators", { method: "GET" });
    const validatorsData = (await validatorsRes.json()) as {
      validators?: ValidatorRecord[];
    };
    const validators = validatorsData.validators ?? [];
    const validator = validators[0];
    const voteAccount =
      validator?.votingPubkey ??
      validator?.voteIdentity ??
      validator?.vote_identity ??
      null;

    if (!voteAccount) {
      throw new Error("No validator vote account available for stake step");
    }

    const outDecimals = getDecimals(outputSymbol, outputMint);
    const outputAmountSol = Number(quote.outputAmount) / 10 ** outDecimals;
    const amountSOL = Number(outputAmountSol.toFixed(6));

    if (!Number.isFinite(amountSOL) || amountSOL <= 0) {
      throw new Error("Swap output amount is invalid for staking");
    }

    setExecuteMsg("Executing step 2: signing stake transaction...");
    return executeStakeAction("stake", { voteAccount, amountSOL });
  }

  async function chainEarnStep(): Promise<string | null> {
    if (!quote) return null;

    const outDecimals = getDecimals(outputSymbol, outputMint);
    const amountUi = (Number(quote.outputAmount) / 10 ** outDecimals).toFixed(6);

    setExecuteMsg("Executing step 2: preparing earn deposit transaction...");
    const quoteRes = await fetch("/api/yield/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: settings.earnProvider,
        mint: outputMint,
        symbol: outputSymbol,
        amountUi,
        owner: account,
        action: "deposit",
      }),
    });

    const yieldData = (await quoteRes.json()) as {
      ok: boolean;
      transaction?: string;
      err?: string;
    };

    if (!quoteRes.ok || !yieldData.ok || !yieldData.transaction) {
      throw new Error(yieldData.err ?? "Could not get earn transaction");
    }

    setExecuteMsg("Executing step 2: signing earn deposit transaction...");
    return executeEarn(
      yieldData.transaction,
      `Deposit ${outputSymbol}`,
      outputSymbol,
      amountUi,
    );
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
      addAlert({
        title: "Plan validation failed",
        message: data.err ?? "Could not validate execution plan.",
        level: "error",
      });
      return;
    }

    setExecuteMsg("Executing step 1: signed swap transaction...");
    addAlert({
      title: "Goal Mode execution started",
      message: `Executing ${goal} with ${settings.provider} route`,
      level: "info",
    });
    const primarySignature = await onExecutePrimarySwap();

    if (!primarySignature) {
      setExecutionState("idle");
      setExecuteMsg("Execution failed while submitting swap transaction.");
      addAlert({
        title: "Primary execution failed",
        message: "Swap transaction failed or was rejected.",
        level: "error",
      });
      return;
    }
    addAlert({
      title: "Swap executed",
      message: "Primary swap step completed successfully.",
      level: "success",
      txSignature: primarySignature,
    });

    let secondarySignature: string | null = null;
    try {
      if (goal === "grow_sol_low_risk") {
        secondarySignature = await chainStakeStep();
      }
      if (goal === "stable_yield_cap_drawdown") {
        secondarySignature = await chainEarnStep();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Secondary step failed";
      setExecutionState("idle");
      setExecuteMsg(`Primary step succeeded. Secondary step failed: ${message}`);
      addAlert({
        title: "Secondary step failed",
        message,
        level: "warning",
      });
      return;
    }

    setExecutionState("idle");
    const step2Label =
      goal === "grow_sol_low_risk"
        ? "Stake"
        : goal === "stable_yield_cap_drawdown"
          ? "Earn Deposit"
          : null;
    setLastExecution({
      swapTx: primarySignature,
      step2Tx: secondarySignature,
      step2Label,
    });
    setExecuteMsg(
      secondarySignature
        ? `Plan completed. Swap tx: ${primarySignature.slice(0, 8)}..., Step2 tx: ${secondarySignature.slice(0, 8)}...`
        : `Primary step completed. Tx: ${primarySignature.slice(0, 8)}...`,
    );
    addAlert({
      title: secondarySignature ? "Plan completed" : "Primary step completed",
      message: secondarySignature
        ? "Swap and follow-up step completed successfully."
        : "Swap completed. No follow-up transaction executed.",
      level: "success",
      txSignature: secondarySignature ?? primarySignature,
    });

    trackEvent("intent_execute_prepared", {
      executionId: data.executionId,
      txSignature: primarySignature,
      secondaryTxSignature: secondarySignature,
      mode: "live-chained",
      goal,
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
            <span className="sw-quote__label">Execution path</span>
            <span className="sw-quote__val">Swap + {goal === "grow_sol_low_risk" ? "Stake" : goal === "stable_yield_cap_drawdown" ? "Earn Deposit" : "Policy"}</span>
          </div>
          <div className="sw-quote__row">
            <span className="sw-quote__label">Route</span>
            <span className="sw-quote__val sw-quote__val--route">{plan.route.join(" -> ")}</span>
          </div>
          <div className="sw-quote__row sw-quote__row--provider">
            <span className="sw-quote__label">Execution</span>
            <span className="sw-quote__provider">solana/kit + pipeit</span>
          </div>
        </div>
      )}

      {executeMsg && <div className="sw-success sw-goal__state">{executeMsg}</div>}

      {lastExecution && (
        <div className="sw-quote sw-goal__quote sw-goal__results">
          <div className="sw-quote__row sw-quote__row--provider">
            <span className="sw-quote__label">Execution Details</span>
            <span className="sw-quote__provider">Completed</span>
          </div>
          <div className="sw-quote__row">
            <span className="sw-quote__label">Step 1</span>
            <a
              className="sw-goal__tx-link"
              href={`https://solscan.io/tx/${lastExecution.swapTx}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Swap tx
            </a>
          </div>
          <div className="sw-quote__row">
            <span className="sw-quote__label">Step 2</span>
            {lastExecution.step2Tx ? (
              <a
                className="sw-goal__tx-link"
                href={`https://solscan.io/tx/${lastExecution.step2Tx}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {lastExecution.step2Label ?? "Follow-up"} tx
              </a>
            ) : (
              <span className="sw-quote__val">Not executed</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
