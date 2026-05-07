import { NextResponse } from "next/server";
import { getHomeMarketsByCategory } from "@/lib/services/homeData.service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") || "all";

  try {
    const rows = await getHomeMarketsByCategory(category);
    return NextResponse.json({
      ok: true,
      data: rows,
      err: null,
      meta: {
        stale: false,
        source: "live",
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to load home markets";
    console.error("[api/home/markets] Error:", message);
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
