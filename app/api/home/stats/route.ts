import { NextResponse } from "next/server";

export async function GET() {
  // TODO: wire real sources (Adrena pool stats + Flash pool data)
  const mockData = {
    tvl: "847M",
    volume24h: "124M",
    activeUsers: "12.4K"
  };

  return NextResponse.json(mockData);
}
