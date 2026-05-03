import { NextRequest, NextResponse } from "next/server";

interface RebalanceRule {
  enabled: boolean;
  maxAllocationPctPerAsset: number;
  driftThresholdPct: number;
  checkIntervalHours: number;
}

interface RebalanceRequest {
  owner?: string;
  currentAllocations?: Array<{ symbol: string; pct: number }>;
  targetAllocations?: Array<{ symbol: string; pct: number }>;
  rule?: RebalanceRule;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RebalanceRequest;

    if (!body.owner || !body.rule || !body.currentAllocations || !body.targetAllocations) {
      return NextResponse.json(
        { ok: false, err: "Missing required fields" },
        { status: 400 },
      );
    }

    const suggestions = body.targetAllocations
      .map((target) => {
        const current = body.currentAllocations?.find((c) => c.symbol === target.symbol);
        const currentPct = current?.pct ?? 0;
        const drift = Number((target.pct - currentPct).toFixed(2));
        return {
          symbol: target.symbol,
          currentPct,
          targetPct: target.pct,
          driftPct: drift,
          shouldRebalance: Math.abs(drift) >= body.rule!.driftThresholdPct,
        };
      })
      .filter((s) => s.shouldRebalance);

    return NextResponse.json({
      ok: true,
      summary: {
        owner: body.owner,
        enabled: body.rule.enabled,
        checksEveryHours: body.rule.checkIntervalHours,
      },
      suggestions,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to evaluate rebalance rules";
    console.error("[api/portfolio/rebalance] Error:", error);
    return NextResponse.json({ ok: false, err: message }, { status: 500 });
  }
}
