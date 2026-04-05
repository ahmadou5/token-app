import axios from "axios";
import type {
  TokenAssetResponse,
  AssetVariant,
  VariantGroups,
  MarketEntry,
} from "@/types/token.types"; // adjust to your actual path

// ─── Raw shapes returned by the upstream API ─────────────────────────────────
// (kept private to this file — callers only see TokenAssetResponse)

interface RawAsset {
  assetId: string;
  name: string;
  symbol: string;
  category: string;
  aliases: string[];
  symbols: string[];
  imageUrl: string;
  stats: TokenAssetResponse["stats"];
  canonicalMarket: TokenAssetResponse["canonicalMarket"];
  primaryVariant: AssetVariant;
  variantGroups: VariantGroups;
}

interface RawMarketsResponse {
  asset: {
    assetId: string;
  };
  includes: {
    markets: {
      ok: boolean;
      data: {
        markets: MarketEntry[];
        total: number;
        offset: number;
        limit: number;
      };
    };
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export const GET = async (request: Request): Promise<Response> => {
  const { searchParams } = new URL(request.url);
  const mint = searchParams.get("mint");

  if (!mint) {
    return new Response(
      JSON.stringify({ error: "Missing required query param: mint" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const base = process.env.TOKEN_API_BASE_URL;
  const headers = {
    "x-api-key": process.env.TOKEN_API_KEY ?? "",
    "Content-Type": "application/json",
  };

  try {
    // 1️⃣  Fetch the canonical asset (gives us assetId + stats + variants)
    const canonicalRes = await axios.get<{ asset: RawAsset }>(
      `${base}/assets/${mint}`,
      { headers },
    );

    const { asset } = canonicalRes.data;
    const assetId = asset.assetId; // ← derived here, not from the caller

    // 2️⃣  Fetch live markets (needs mint for filtering, assetId for the context)
    const [marketsRes, variantsRes] = await Promise.all([
      axios.get<RawMarketsResponse>(
        `${base}/assets/solana?include=markets&mint=${mint}&marketsOffset=0&marketsLimit=50`,
        { headers },
      ),
      axios.get<{ asset: RawAsset }>(
        `${base}/assets/${assetId}/variants?groupBy=asset`,
        { headers },
      ),
    ]);

    const marketsData = marketsRes.data.includes.markets;
    const variantGroups =
      variantsRes.data.asset.variantGroups ?? asset.variantGroups;

    // 3️⃣  Merge into a single flat response
    const merged: TokenAssetResponse = {
      // Identity
      assetId: asset.assetId,
      name: asset.name,
      symbol: asset.symbol,
      category: asset.category,
      aliases: asset.aliases,
      symbols: asset.symbols,
      imageUrl: asset.imageUrl,

      // Stats
      stats: asset.stats,
      canonicalMarket: asset.canonicalMarket,
      primaryVariant: asset.primaryVariant,

      // Variants (prefer the dedicated variants endpoint, fall back to canonical)
      variantGroups,

      // Markets
      markets: marketsData.data.markets,
      marketsTotal: marketsData.data.total,
      marketsOffset: marketsData.data.offset,
      marketsLimit: marketsData.data.limit,
    };

    return new Response(JSON.stringify(merged), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[token-asset] Failed to fetch:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch token asset data" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
