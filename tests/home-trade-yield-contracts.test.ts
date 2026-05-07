import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/services/homeData.service", () => ({
  getHomeStatsData: vi.fn(),
  getHomePerpPrices: vi.fn(),
  getHomeMarketsByCategory: vi.fn(),
}));

vi.mock("@/lib/adrena", () => ({
  getPositions: vi.fn(),
}));

import {
  getHomeStatsData,
  getHomePerpPrices,
  getHomeMarketsByCategory,
} from "@/lib/services/homeData.service";
import { getPositions } from "@/lib/adrena";
import { GET as homeStatsGet } from "@/app/api/home/stats/route";
import { GET as homePricesGet } from "@/app/api/home/prices/route";
import { GET as homeMarketsGet } from "@/app/api/home/markets/route";
import { GET as tradeGet } from "@/app/api/trade/route";
import { POST as yieldQuotePost } from "@/app/api/yield/quote/route";

describe("Home/Trade/Yield route contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/home/stats returns normalized success envelope", async () => {
    vi.mocked(getHomeStatsData).mockResolvedValueOnce({
      tvl: "1.00B",
      volume24h: "300.00M",
      activeUsers: "1234.00",
    });

    const res = await homeStatsGet();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.err).toBeNull();
    expect(data.data.tvl).toBe("1.00B");
    expect(data.meta.stale).toBe(false);
  });

  it("GET /api/home/stats returns fallback envelope on failure", async () => {
    vi.mocked(getHomeStatsData).mockRejectedValueOnce(new Error("upstream down"));

    const res = await homeStatsGet();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(false);
    expect(typeof data.err).toBe("string");
    expect(data.data).toEqual({ tvl: "0", volume24h: "0", activeUsers: "0" });
    expect(data.meta.stale).toBe(true);
  });

  it("GET /api/home/prices returns normalized envelope", async () => {
    vi.mocked(getHomePerpPrices).mockResolvedValueOnce([
      { symbol: "SOL-PERP", price: 100, change24h: 1.5 },
    ]);

    const res = await homePricesGet();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data[0].symbol).toBe("SOL-PERP");
  });

  it("GET /api/home/markets returns normalized envelope", async () => {
    vi.mocked(getHomeMarketsByCategory).mockResolvedValueOnce([
      {
        symbol: "SOL",
        name: "Solana",
        price: 100,
        change24h: 1,
        volume24h: "1.00M",
        logoUri: "",
      },
    ]);

    const req = new NextRequest("http://localhost/api/home/markets?category=all");
    const res = await homeMarketsGet(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data[0].symbol).toBe("SOL");
  });

  it("GET /api/trade returns 400 with err when wallet missing", async () => {
    const req = new NextRequest("http://localhost/api/trade");
    const res = await tradeGet(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.err).toMatch(/wallet required/i);
    expect(Array.isArray(data.openPositions)).toBe(true);
  });

  it("GET /api/trade returns normalized success envelope", async () => {
    vi.mocked(getPositions).mockResolvedValueOnce([
      {
        position_id: 1,
        symbol: "SOL",
        side: "long",
        entry_price: 100,
        entry_size: 1000,
        entry_leverage: 2,
        entry_date: "2026-05-07T00:00:00.000Z",
        collateral_amount: 500,
        status: "open",
      },
    ] as any);

    const req = new NextRequest(
      "http://localhost/api/trade?wallet=6ecebb7c0cb169311024e46df0e07d35874ef185550760293573785be8879f56",
    );
    const res = await tradeGet(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.err).toBeNull();
    expect(Array.isArray(data.openPositions)).toBe(true);
    expect(data.openPositions[0].symbol).toBe("SOL");
  });

  it("POST /api/yield/quote returns paused note for drift", async () => {
    const req = new NextRequest("http://localhost/api/yield/quote", {
      method: "POST",
      body: JSON.stringify({
        provider: "drift",
        symbol: "SOL",
        amountUi: "1",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await yieldQuotePost(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.executionAvailable).toBe(false);
    expect(data.note).toMatch(/temporarily paused/i);
  });
});

