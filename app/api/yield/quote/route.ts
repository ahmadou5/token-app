import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, mint, symbol, amountUi, owner, action } = body;

    // TODO: Integrate real vault APIs (Kamino, MarginFi, Drift)
    // For now, return mock data

    const mockApy: Record<string, number> = {
      kamino: 7.42,
      marginfi: 6.85,
      drift: 8.12,
    };

    const apy = mockApy[provider] || 5.0;
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
      // Placeholder transaction (base64)
      transaction: "AgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
      err: null,
    });
  } catch (error: any) {
    console.error("[api/yield/quote] Error:", error);
    return NextResponse.json(
      { ok: false, err: error.message || "Failed to fetch quote" },
      { status: 500 }
    );
  }
}
