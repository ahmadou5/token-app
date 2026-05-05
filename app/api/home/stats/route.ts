import { NextResponse } from "next/server";
import { getHomeStatsData } from "@/lib/services/homeData.service";

export async function GET() {
  try {
    const stats = await getHomeStatsData();
    return NextResponse.json(stats);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to load home stats";
    console.error("[api/home/stats] Error:", message);
    return NextResponse.json(
      { tvl: "0", volume24h: "0", activeUsers: "0" },
      { status: 200 },
    );
  }
}
