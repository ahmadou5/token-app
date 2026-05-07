import { NextResponse } from "next/server";
import { getHomePerpPrices } from "@/lib/services/homeData.service";

export async function GET() {
  try {
    const prices = await getHomePerpPrices();
    return NextResponse.json({
      ok: true,
      data: prices,
      err: null,
      meta: {
        stale: false,
        source: "live",
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to load home prices";
    console.error("[api/home/prices] Error:", message);
    return NextResponse.json({
      ok: false,
      data: [],
      err: message,
      meta: {
        stale: true,
        source: "fallback",
      },
    });
  }
}
