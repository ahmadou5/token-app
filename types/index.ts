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
  includes: {
    profile?: {
      ok: boolean;
      data: AssetProfile;
    };
    risk?: {
      ok: boolean;
      data: AssetRisk;
    };
    markets?: {
      ok: boolean;
      data: {
        markets: AssetMarket[];
        total: number;
      };
    };
  };
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

export interface AssetProfile {
  marketCap: number;
  fdv: number;
  circulatingSupply: number;
  totalSupply: number;
  price: number;
  priceChange24h: number;
  volume24h: number;
  allTimeHigh: number;
  allTimeHighDate: string;
  description: string;
  links: {
    website?: string;
    reddit?: string;
    twitter?: string;
  };
}

export interface AssetRisk {
  marketScore: {
    score: number;
    grade: string;
    label: string;
    tone: "safe" | "warning" | "danger";
    components: Record<
      string,
      { score: number; status: string; hasData: boolean }
    >;
  };
}

export interface AssetMarket {
  address: string;
  name: string;
  price: number;
  liquidity: number;
  volume24h: number;
  source: string;
  base: { symbol: string; icon?: string };
  quote: { symbol: string; icon?: string };
}

// Matches the actual variantGroups API response structure
export interface RawVariantMarket {
  price: number | null;
  liquidity: number | null;
  volume24hUSD: number | null;
  marketCap: number | null;
  priceChange24hPercent: number | null;
  priceChange1hPercent: number | null;
  decimals: number | null;
  logoURI: string | null;
  lastFetchedAt: number | null;
}

export interface RawVariant {
  variantId: string;
  mint: string;
  kind: "native" | "yield" | "spot" | "etf" | "leveraged" | string;
  trustTier: string;
  tags: string[];
  issuer?: string;
  issuerUrl?: string;
  label?: string;
  symbol?: string;
  name?: string;
  market: RawVariantMarket | null;
}

export interface VariantGroups {
  spot: RawVariant[];
  yield: RawVariant[];
  etf: RawVariant[];
  leveraged: RawVariant[];
}

export interface TokenStats {
  price: number | null;
  liquidity: number | null;
  volume24hUSD: number | null;
  marketCap: number | null;
  priceChange24hPercent: number | null;
  priceChange1hPercent: number | null;
}

export interface TokenPrimaryVariant {
  variantId: string;
  mint: string;
  kind: string;
  trustTier: string;
  tags: string[];
  issuer?: string;
  symbol?: string;
  name?: string;
  market: RawVariantMarket | null;
}

export interface AssetMarket {
  address: string;
  name: string;
  price: number;
  liquidity: number;
  volume24h: number;
  source: string;
  base: { symbol: string; icon?: string };
  quote: { symbol: string; icon?: string };
  trades24h?: number;
  trades24hChange?: number;
  wallets24h?: number;
  wallets24hChange?: number;
}

export interface TokenAssetResponse {
  assetId: string;
  name: string;
  symbol: string;
  category: string;
  imageUrl: string | null;
  stats: TokenStats;
  primaryVariant: TokenPrimaryVariant | null;
  variantGroups: VariantGroups;
  markets: AssetMarket[];
  marketsTotal: number;
}
