import { NextRequest, NextResponse } from "next/server";
import type { IntentPlan } from "@/types/intent";

interface StrategyExecuteRequest {
  owner?: string;
  plan?: IntentPlan;
  dryRun?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as StrategyExecuteRequest;

    if (!body.owner) {
      return NextResponse.json(
        { ok: false, err: "Missing owner wallet" },
        { status: 400 },
      );
    }

    if (!body.plan) {
      return NextResponse.json(
        { ok: false, err: "Missing strategy plan" },
        { status: 400 },
      );
    }

    if (body.plan.blocked) {
      return NextResponse.json(
        { ok: false, err: "Risk checks failed. Strategy is blocked." },
        { status: 400 },
      );
    }

    const executionId = `exec_${Date.now()}`;

    const actions = body.plan.steps.map((step, index) => ({
      order: index + 1,
      kind: step.kind,
      protocol: step.protocol,
      action: step.action,
      status: "queued",
    }));

    const liveMode = body.dryRun !== true;

    return NextResponse.json({
      ok: true,
      executionId,
      dryRun: !liveMode,
      message:
        "Strategy plan accepted. Execute primary swap with existing solana/kit + pipeit hooks, then continue optional steps.",
      actions: actions.map((a) => ({
        ...a,
        status: liveMode ? "ready" : "queued",
      })),
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to prepare strategy execution";
    console.error("[api/strategy/execute] Error:", error);
    return NextResponse.json({ ok: false, err: message }, { status: 500 });
  }
}
