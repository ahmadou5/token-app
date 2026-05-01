import { NextRequest, NextResponse } from "next/server";
import { getAllProviderYields } from "@/lib/services/yield.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol");

    if (!symbol) {
      return NextResponse.json({ error: "Symbol is required" }, { status: 400 });
    }

    const apyMap = await getAllProviderYields(symbol);

    return NextResponse.json({
      apyMap,
    });
  } catch (error: any) {
    console.error("[api/yield/quote/all] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch all yields" },
      { status: 500 }
    );
  }
}
