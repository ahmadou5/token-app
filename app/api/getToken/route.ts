import axios from "axios";
import { limiter } from "@/lib/rate-limit";
import type {
  TokenAssetResponse,
  AssetVariant,
  AssetProfile,
  AssetRisk,
  VariantGroups,
  VariantKind,
  RawVariant,
  MarketEntry,
  CanonicalMarket,
  AssetStats,
  OHLCVEntry,
} from "@/types/token.types"; // adjust to your actual path

// ─── Raw shapes from the upstream API ────────────────────────────────────────

interface RawAsset {
  assetId: string;
  name: string;
  symbol: string;
  category: string;
  aliases: string[];
  symbols: string[];
  imageUrl: string;
  stats: AssetStats;
  canonicalMarket: CanonicalMarket;
  primaryVariant: AssetVariant;
  variantGroups: VariantGroups;
}

interface RawCanonicalResponse {
  asset: RawAsset;
  includes: {
    markets?: {
      ok: boolean;
      data: {
        markets: MarketEntry[];
        total: number;
        offset: number;
        limit: number;
      };
    };
    profile?: {
      ok: boolean;
      data: AssetProfile;
    };
    risk?: {
      ok: boolean;
      data: AssetRisk;
    };
    ohlcv?: {
      ok: boolean;
      data: OHLCVEntry[];
    };
  };
}

interface RawVariantsResponse {
  assetId: string;
  variants: RawVariant[];
}

// ─── Helper: group flat variants[] into { spot, etf, yield, leveraged } ──────

const KIND_TO_GROUP: Record<VariantKind, keyof VariantGroups> = {
  native: "spot",
  yield: "yield",
  etf: "etf",
  leveraged: "leveraged",
};

function groupVariants(variants: RawVariant[]): VariantGroups {
  const groups: VariantGroups = { spot: [], etf: [], yield: [], leveraged: [] };
  for (const variant of variants) {
    const group = KIND_TO_GROUP[variant.kind] ?? "spot";
    groups[group].push(variant);
  }
  return groups;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export const GET = async (request: Request): Promise<Response> => {
  const { searchParams } = new URL(request.url);
  const assetId = searchParams.get("assetId");

  // 1. Rate Limiting Check
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "anonymous";
  const isAllowed = limiter.check(100, ip);
  if (!isAllowed) {
    return new Response(
      JSON.stringify({ error: "Too many requests" }),
      { status: 429, headers: { "Content-Type": "application/json" } },
    );
  }

  const interval = searchParams.get("ohlcvInterval") || "1H";
  const from = searchParams.get("ohlcvFrom");
  const to = searchParams.get("ohlcvTo");

  if (!assetId) {
    return new Response(
      JSON.stringify({ error: "Missing required query param: assetId" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const base = process.env.TOKEN_API_BASE_URL;
  const headers = {
    "x-api-key": process.env.TOKEN_API_KEY ?? "",
    "Content-Type": "application/json",
  };

  try {
    // 1. Fetch the asset data with all includes from the upstream API
    let url = `${base}/assets/${assetId}?include=markets&include=profile&include=risk&include=ohlcv&marketsOffset=0&marketsLimit=50`;
    
    if (interval) url += `&ohlcvInterval=${interval}`;
    if (from) url += `&ohlcvFrom=${from}`;
    if (to) url += `&ohlcvTo=${to}`;

    // 2. Parallel fetch for variants
    const [canonicalRes, variantsRes] = await Promise.all([
      axios.get<RawCanonicalResponse>(url, { headers }),
      axios.get<RawVariantsResponse>(
        `${base}/assets/${assetId}/variants?groupBy=asset`,
        { headers },
      ),
    ]);

    const { asset, includes } = canonicalRes.data;

    const marketsData = includes.markets?.data;
    const profile = includes.profile?.data ?? null;
    const risk = includes.risk?.data ?? null;
    const ohlcv = includes.ohlcv ?? null;

    // Group the flat variants[] by kind, fall back to what canonical embeds
    const variantGroups: VariantGroups = variantsRes.data.variants?.length
      ? groupVariants(variantsRes.data.variants)
      : asset.variantGroups;

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

      // Variants
      variantGroups,

      // Profile & risk
      profile,
      risk,

      // Markets
      markets: marketsData?.markets ?? [],
      marketsTotal: marketsData?.total ?? 0,
      marketsOffset: marketsData?.offset ?? 0,
      marketsLimit: marketsData?.limit ?? 50,
    };

    // Standardized response structure matching the user's requirement
    return new Response(
      JSON.stringify({
        asset: merged,
        includes: {
          ohlcv,
          profile,
          risk,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[getToken] Failed to fetch:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch token asset data" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
