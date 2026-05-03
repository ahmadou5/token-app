import { NextRequest, NextResponse } from "next/server";
import { isBlocked, runRiskChecks } from "@/lib/riskEngine";
import type {
  IntentGoal,
  IntentPlan,
  IntentRequest,
  IntentStep,
} from "@/types/intent";

type QuoteShape = {
  outAmount: string;
  priceImpactPct: string;
  route: string[];
};

const STABLE_OUTPUTS = new Set([
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
]);

function parseAmountUi(amountUi: string, decimals = 6): bigint {
  const parsed = Number.parseFloat(amountUi);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0n;
  return BigInt(Math.floor(parsed * 10 ** decimals));
}

function buildSteps(goal: IntentGoal, provider: "metis" | "titan"): IntentStep[] {
  if (goal === "grow_sol_low_risk") {
    return [
      {
        id: "swap-core",
        kind: "swap",
        title: "Execute spot swap",
        description: "Route through best execution path and receive target asset",
        protocol: provider,
        action: "swap",
      },
      {
        id: "stake-overlay",
        kind: "stake",
        title: "Stake received SOL",
        description: "Delegate into validator set for low-volatility baseline yield",
        protocol: "native-stake",
        action: "stake",
      },
    ];
  }

  if (goal === "stable_yield_cap_drawdown") {
    return [
      {
        id: "swap-stable",
        kind: "swap",
        title: "Normalize to stable exposure",
        description: "Rotate into stable output for principal protection",
        protocol: provider,
        action: "swap",
      },
      {
        id: "earn-deposit",
        kind: "earn",
        title: "Deposit to Earn vault",
        description: "Allocate to risk-adjusted vault selected by provider settings",
        protocol: "kamino",
        action: "deposit",
      },
    ];
  }

  return [
    {
      id: "swap-momentum",
      kind: "swap",
      title: "Open momentum entry",
      description: "Use capped slippage and execution guardrails",
      protocol: provider,
      action: "swap",
    },
    {
      id: "perp-hedge",
      kind: "rebalance",
      title: "Set hedge policy",
      description: "Track exposure and rebalance when risk threshold is breached",
      protocol: "flash/adrena",
      action: "set_rebalance_rule",
    },
  ];
}

async function fetchMetisQuote(
  inputMint: string,
  outputMint: string,
  amount: bigint,
  slippageBps: number,
): Promise<QuoteShape> {
  const apiKey =
    process.env.NEXT_PUBLIC_METIS_API_KEY ??
    process.env.NEXT_PUBLIC_JUP_API_KEY ??
    "";

  const url = new URL("https://api.jup.ag/swap/v1/quote");
  url.searchParams.set("inputMint", inputMint);
  url.searchParams.set("outputMint", outputMint);
  url.searchParams.set("amount", amount.toString());
  url.searchParams.set("slippageBps", String(slippageBps));

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["x-api-key"] = apiKey;

  const res = await fetch(url.toString(), { headers, cache: "no-store" });
  if (!res.ok) throw new Error(`Metis quote failed: ${res.status}`);

  const data = await res.json();

  const route: string[] = (data.routePlan ?? [])
    .slice(0, 4)
    .map((r: { swapInfo?: { label?: string } }) => r.swapInfo?.label ?? "DEX")
    .filter((v: string, i: number, arr: string[]) => arr.indexOf(v) === i);

  return {
    outAmount: String(data.outAmount ?? "0"),
    priceImpactPct: String(data.priceImpactPct ?? "0"),
    route,
  };
}

async function fetchTitanQuote(
  inputMint: string,
  outputMint: string,
  amount: bigint,
  slippageBps: number,
): Promise<QuoteShape> {
  const url = new URL("https://api.titan-swap.xyz/v1/quote");
  url.searchParams.set("inputMint", inputMint);
  url.searchParams.set("outputMint", outputMint);
  url.searchParams.set("amount", amount.toString());
  url.searchParams.set("slippageBps", String(slippageBps));

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) {
    return fetchMetisQuote(inputMint, outputMint, amount, slippageBps);
  }

  const data = await res.json();

  const route: string[] = Array.isArray(data.routePlan)
    ? (data.routePlan as { swapInfo?: { label?: string } }[])
        .slice(0, 4)
        .map((r) => r.swapInfo?.label ?? "Titan")
        .filter((v, i, arr) => arr.indexOf(v) === i)
    : ["Titan"];

  return {
    outAmount: String(data.outAmount ?? data.outputAmount ?? "0"),
    priceImpactPct: String(data.priceImpactPct ?? data.priceImpact ?? "0"),
    route,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as IntentRequest;
    const inputAmount = parseFloat(body.inputAmountUi);

    if (!body.inputMint || !body.outputMint || !body.goal || !body.riskProfile) {
      return NextResponse.json(
        { ok: false, err: "Missing required fields" },
        { status: 400 },
      );
    }

    if (!Number.isFinite(inputAmount) || inputAmount <= 0) {
      return NextResponse.json(
        { ok: false, err: "Invalid input amount" },
        { status: 400 },
      );
    }

    const amountRaw = parseAmountUi(body.inputAmountUi, body.inputDecimals ?? 6);
    const slippageBps = Math.round(body.slippagePercent * 100);

    const quote =
      body.provider === "titan"
        ? await fetchTitanQuote(body.inputMint, body.outputMint, amountRaw, slippageBps)
        : await fetchMetisQuote(body.inputMint, body.outputMint, amountRaw, slippageBps);

    const priceImpactPercent = Number.parseFloat(quote.priceImpactPct) * 100;

    const riskChecks = runRiskChecks({
      amountUi: inputAmount,
      goal: body.goal,
      riskProfile: body.riskProfile,
      slippagePercent: body.slippagePercent,
      priceImpactPercent,
    });

    const plan: IntentPlan = {
      id: `intent_${Date.now()}`,
      goal: body.goal,
      riskProfile: body.riskProfile,
      provider: body.provider,
      inputMint: body.inputMint,
      outputMint: body.outputMint,
      inputAmountUi: body.inputAmountUi,
      expectedOutputUi: quote.outAmount,
      expectedPriceImpactPercent: priceImpactPercent,
      route: quote.route,
      riskChecks,
      blocked: isBlocked(riskChecks),
      steps: buildSteps(body.goal, body.provider),
      createdAt: new Date().toISOString(),
    };

    if (body.goal === "stable_yield_cap_drawdown" && !STABLE_OUTPUTS.has(body.outputMint)) {
      plan.steps.unshift({
        id: "prefilter",
        kind: "swap",
        title: "Stable output recommended",
        description: "For this goal, select USDC/USDT as output for better drawdown control",
        protocol: body.provider,
        action: "advice",
      });
    }

    return NextResponse.json({ ok: true, plan });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to build intent quote";
    console.error("[api/intent/quote] Error:", error);
    return NextResponse.json({ ok: false, err: message }, { status: 500 });
  }
}
