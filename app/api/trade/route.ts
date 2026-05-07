import { NextRequest, NextResponse } from "next/server";
import { getPositions } from "@/lib/adrena";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");

  if (!wallet) {
    return NextResponse.json(
      { ok: false, err: "wallet required", openPositions: [] },
      { status: 400 },
    );
  }

  try {
    const positions = await getPositions(wallet);
    const openPositions = positions
      .filter((p) => p.status === "open")
      .map((p) => ({
        positionId: p.position_id,
        symbol: p.symbol,
        side: p.side,
        entryPrice: p.entry_price,
        entrySize: p.entry_size,
        entryLeverage: p.entry_leverage,
        entryDate: p.entry_date,
        collateralAmount: p.collateral_amount,
      }));

    return NextResponse.json({ ok: true, openPositions, err: null });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch positions";
    console.error("[api/trade] Error:", message);
    return NextResponse.json(
      { ok: false, err: message, openPositions: [] },
      { status: 500 },
    );
  }
}
