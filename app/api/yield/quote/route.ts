import { NextRequest, NextResponse } from "next/server";
import { fetchYieldAPY } from "@/lib/services/yield.service";
import type { EarnProvider } from "@/context/SwapSettingsContext";

interface YieldQuoteBody {
  provider: EarnProvider;
  symbol: string;
  amountUi: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<YieldQuoteBody>;
    const provider = body.provider;
    const symbol = body.symbol;
    const amountUi = body.amountUi;

    if (
      (provider !== "kamino" &&
        provider !== "marginfi" &&
        provider !== "drift" &&
        provider !== "jupiter") ||
      typeof symbol !== "string" ||
      !symbol ||
      typeof amountUi !== "string"
    ) {
      return NextResponse.json(
        { ok: false, err: "Invalid quote payload" },
        { status: 400 },
      );
    }

    const apy = await fetchYieldAPY(provider, symbol);
    const amount = parseFloat(amountUi) || 0;
    const dailyEarningsUsd = (amount * (apy / 100)) / 365;

    return NextResponse.json({
      ok: true,
      quote: {
        apy,
        dailyEarningsUsd,
        protocolFeePercent: 0.1,
        provider,
      },
      transaction: null,
      executionAvailable: false,
      note: "Yield execution is not wired yet. Quote is informational only.",
      err: null,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch quote";
    console.error("[api/yield/quote] Error:", error);
    return NextResponse.json(
      { ok: false, err: message },
      { status: 500 }
    );
  }
}
