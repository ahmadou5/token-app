export interface AssetsSearchResponse {
  query: string;
  category: string | null;
  results: Array<{
    assetId: string;
    name?: string;
    symbol?: string;
    category: string;
    imageUrl: string | null;
    stats: null | {
      price: number | null;
      liquidity: number | null;
      volume24hUSD: number | null;
      marketCap: number | null;
      priceChange24hPercent: number | null;
      priceChange1hPercent: number | null;
    };
    primaryVariant: null | {
      variantId: string;
      mint: string;
      kind: string;
      trustTier: string;
      tags: string[];
      issuer?: string;
      issuerUrl?: string;
      label?: string;
      symbol?: string;
      name?: string;
      market: null | {
        price: number | null;
        liquidity: number | null;
        volume24hUSD: number | null;
        marketCap: number | null;
        priceChange24hPercent: number | null;
        priceChange1hPercent: number | null;
        decimals: number | null;
        logoURI: string | null;
        lastFetchedAt: number | null;
      };
    };
  }>;
}

export interface AssetsResolveResponse {
  assetId: string;
  asset: {
    assetId: string;
    name: string | null;
    symbol: string | null;
    category: string;
    aliases: string[];
  };
  variant: {
    mint: string;
    chain: string;
    kind: string;
    trustTier: string;
    tags: string[];
    issuer?: string;
    issuerUrl?: string;
    label?: string;
  } | null;
}

export interface AssetsCuratedResponse {
  listId: string;
  assets: Array<{
    assetId: string;
    name?: string;
    symbol?: string;
    category: string;
    imageUrl: string | null;
    stats: null | {
      price: number | null;
      liquidity: number | null;
      volume24hUSD: number | null;
      marketCap: number | null;
      priceChange24hPercent: number | null;
      priceChange1hPercent: number | null;
    };
    primaryVariant: null | {
      variantId: string;
      mint: string;
      kind: string;
      trustTier: string;
      tags: string[];
      issuer?: string;
      issuerUrl?: string;
      label?: string;
      symbol?: string;
      name?: string;
      market: null | {
        price: number | null;
        liquidity: number | null;
        volume24hUSD: number | null;
        marketCap: number | null;
        priceChange24hPercent: number | null;
        priceChange1hPercent: number | null;
        decimals: number | null;
        logoURI: string | null;
        lastFetchedAt: number | null;
      };
    };
  }>;
}

export interface AssetsVariantMarketsResponse {
  variants: Array<{
    mint: string;
    assetId: string | null;
    chain: string | null;
    market: Record<string, unknown> | null;
  }>;
}

export interface AssetsRiskSummaryResponse {
  score: number;
  grade: string;
  label: string;
  tone: "info" | "success" | "warning" | "danger";
  isTrustedLaunch: boolean;
  caps: Array<unknown>;
  hasInsufficientData: boolean;
  insufficientDataReason?: string;
}

export interface OHLCVCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// The "Raw" format coming from the API (Unix, O, H, L, C, V)
export type RawOHLCVTuple = [number, number, number, number, number, number];

export interface RawOHLCVResponse {
  candles?: RawOHLCVTuple[];
  data?: RawOHLCVTuple[];
  // Sometimes APIs return the array directly
}
