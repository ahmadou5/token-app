import { NextResponse } from "next/server";
import { getHomePerpPrices } from "@/lib/services/homeData.service";

export async function GET() {
  try {
    const prices = await getHomePerpPrices();
    return NextResponse.json(prices);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to load home prices";
    console.error("[api/home/prices] Error:", message);
    return NextResponse.json([]);
  }
}
