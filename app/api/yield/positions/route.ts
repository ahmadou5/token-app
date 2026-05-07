import { NextRequest, NextResponse } from "next/server";
import {
  applyYieldPositionDelta,
  listYieldPositions,
} from "@/lib/services/yieldPositionsStore.service";
import { fetchOnChainYieldPositions } from "@/lib/services/yield.service";

function isValidBody(body: unknown): body is {
  wallet: string;
  provider: "kamino" | "marginfi" | "jupiter";
  mint: string;
  symbol: string;
  action: "deposit" | "withdraw";
  amount: number;
} {
  if (!body || typeof body !== "object") return false;
  const v = body as Record<string, unknown>;
  const providerOk =
    v.provider === "kamino" ||
    v.provider === "marginfi" ||
    v.provider === "jupiter";
  const actionOk = v.action === "deposit" || v.action === "withdraw";
  return (
    typeof v.wallet === "string" &&
    v.wallet.length >= 32 &&
    providerOk &&
    typeof v.mint === "string" &&
    v.mint.length >= 32 &&
    typeof v.symbol === "string" &&
    v.symbol.length > 0 &&
    actionOk &&
    typeof v.amount === "number" &&
    Number.isFinite(v.amount) &&
    v.amount > 0
  );
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get("wallet");

    if (!wallet) {
      return NextResponse.json({ ok: false, err: "Missing wallet address" }, { status: 400 });
    }

    const [storedRows, onChainRows] = await Promise.all([
      listYieldPositions(wallet),
      fetchOnChainYieldPositions(wallet).catch(() => []),
    ]);

    // Merge positions: prefer on-chain data, fallback to stored demo positions
    const merged = [...onChainRows];
    for (const s of storedRows) {
      if (!merged.find((m) => m.mint === s.mint && m.provider === s.provider)) {
        merged.push({
          provider: s.provider,
          mint: s.mint,
          symbol: s.symbol,
          amount: s.amount,
          yieldUsd: s.yieldUsd,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      positions: merged,
      err: null,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch positions";
    console.error("[api/yield/positions] Error:", error);
    return NextResponse.json(
      { ok: false, err: message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!isValidBody(body)) {
      return NextResponse.json(
        { ok: false, err: "Invalid payload" },
        { status: 400 },
      );
    }

    const positions = await applyYieldPositionDelta(body);
    return NextResponse.json({
      ok: true,
      positions: positions.map((p) => ({
        provider: p.provider,
        mint: p.mint,
        symbol: p.symbol,
        amount: p.amount,
        yieldUsd: p.yieldUsd,
      })),
      err: null,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update positions";
    console.error("[api/yield/positions][POST] Error:", error);
    return NextResponse.json(
      { ok: false, err: message },
      { status: 500 },
    );
  }
}
