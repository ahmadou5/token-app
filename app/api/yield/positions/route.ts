import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get("wallet");

    if (!wallet) {
      return NextResponse.json({ ok: false, err: "Missing wallet address" }, { status: 400 });
    }

    // TODO: Integrate real vault APIs to fetch active positions
    // For now, return mock data or empty array

    return NextResponse.json({
      ok: true,
      positions: [
        // Mock position if needed for testing UI
        /*
        {
          provider: "kamino",
          mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          symbol: "USDC",
          amount: 1000.5,
          yieldUsd: 12.45,
        }
        */
      ],
      err: null,
    });
  } catch (error: any) {
    console.error("[api/yield/positions] Error:", error);
    return NextResponse.json(
      { ok: false, err: error.message || "Failed to fetch positions" },
      { status: 500 }
    );
  }
}
