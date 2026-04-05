// ─── Shared primitives ───────────────────────────────────────────────────────

export interface MarketStats {
  price: number;
  liquidity: number;
  volume24hUSD: number;
  marketCap: number;
  priceChange24hPercent: number;
  priceChange1hPercent: number;
  decimals?: number;
  logoURI?: string;
  lastFetchedAt?: number;
}

// ─── Canonical market (CoinGecko source) ─────────────────────────────────────

export interface CanonicalMarket {
  source: string;
  coinId: string;
  price: number;
  marketCap: number;
  volume24hUSD: number;
  priceChange24hPercent: number;
  lastFetchedAt: number;
  providerLastUpdatedAt: number;
}

// ─── Asset-level stats (top-level summary) ────────────────────────────────────

export interface AssetStats {
  price: number;
  liquidity: number;
  volume24hUSD: number;
  marketCap: number;
  priceChange24hPercent: number;
  priceChange1hPercent: number;
}

// ─── Variant (spot / yield token) ────────────────────────────────────────────

export type TrustTier = "tier1" | "tier2" | "tier3";
export type VariantKind = "native" | "yield" | "etf" | "leveraged";

export interface AssetVariant {
  variantId: string;
  mint: string;
  kind: VariantKind;
  trustTier: TrustTier;
  tags: string[];
  issuer?: string;
  symbol: string;
  name: string;
  market: MarketStats;
  rank: number;
}

// ─── Variant groups (grouped by category) ────────────────────────────────────

export interface VariantGroups {
  spot: AssetVariant[];
  etf: AssetVariant[];
  yield: AssetVariant[];
  leveraged: AssetVariant[];
}

// ─── Market entry (from the includes.markets list) ───────────────────────────

export interface MarketTokenRef {
  address: string;
  decimals: number;
  icon?: string;
  symbol?: string;
}

export interface MarketEntry {
  address: string;
  base: MarketTokenRef;
  quote: MarketTokenRef;
  name: string;
  source: string;
  createdAt: string;
  price: number;
  liquidity: number;
  volume24h: number;
  trade24h: number;
  trade24hChangePercent: number;
  uniqueWallet24h: number;
  uniqueWallet24hChangePercent: number;
}

export interface MarketsResult {
  ok: boolean;
  data: {
    markets: MarketEntry[];
    total: number;
    offset: number;
    limit: number;
  };
}

// ─── Merged / flat token response ────────────────────────────────────────────
// This is what the route returns after merging the three API calls.

export interface TokenAssetResponse {
  // Identity
  assetId: string;
  name: string;
  symbol: string;
  category: string;
  aliases: string[];
  symbols: string[];
  imageUrl: string;

  // Aggregated market stats
  stats: AssetStats;

  // Canonical price source (e.g. CoinGecko)
  canonicalMarket: CanonicalMarket;

  // The primary tradeable variant (e.g. wSOL for Solana)
  primaryVariant: AssetVariant;

  // All variants grouped by type
  variantGroups: VariantGroups;

  // Live markets for this asset
  markets: MarketEntry[];
  marketsTotal: number;
  marketsOffset: number;
  marketsLimit: number;
}
