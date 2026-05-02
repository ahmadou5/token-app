import { NextResponse } from "next/server";

export async function GET() {
  // TODO: Fetch real prices from Flash Trade GET /prices
  // Example: const res = await fetch("https://api.flash.trade/prices");
  
  const mockPrices = [
    { symbol: "SOL-PERP", price: 142.45, change24h: 3.2 },
    { symbol: "BTC-PERP", price: 64231.10, change24h: -1.5 },
    { symbol: "ETH-PERP", price: 3412.55, change24h: 0.8 }
  ];

  return NextResponse.json(mockPrices);
}
