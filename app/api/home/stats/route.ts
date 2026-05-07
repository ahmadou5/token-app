import { NextResponse } from "next/server";
import { getHomeStatsData } from "@/lib/services/homeData.service";

export async function GET() {
  try {
    const stats = await getHomeStatsData();
    return NextResponse.json({
      ok: true,
      data: stats,
      err: null,
      meta: {
        stale: false,
        source: "live",
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to load home stats";
    console.error("[api/home/stats] Error:", message);
    return NextResponse.json(
      {
        ok: false,
        data: { tvl: "0", volume24h: "0", activeUsers: "0" },
        err: message,
        meta: {
          stale: true,
          source: "fallback",
        },
      },
      { status: 200 }
    );
  }
}
