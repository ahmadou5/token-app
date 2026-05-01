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

// ─── Asset-level stats ────────────────────────────────────────────────────────

export interface AssetStats {
  price: number;
  liquidity: number;
  volume24hUSD: number;
  marketCap: number;
  priceChange24hPercent: number;
  priceChange1hPercent: number;
}

// ─── Variant ──────────────────────────────────────────────────────────────────

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

// Shape returned by the flat variants endpoint: { assetId, variants[] }
export interface RawVariant {
  mint: string;
  chain: string;
  kind: VariantKind;
  trustTier: TrustTier;
  tags: string[];
  issuer?: string;
  issuerUrl?: string;
  label?: string;
}

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

// ─── Variant groups (built by grouping flat variants[] by kind) ───────────────
export interface RawVariant {
  variantId: string;
  mint: string;
  kind: VariantKind;
  trustTier: TrustTier;
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

// ─── Profile (from ?include=profile) ─────────────────────────────────────────

export interface AssetProfileLinks {
  website?: string;
  twitter?: string;
  reddit?: string;
  telegram?: string;
  discord?: string;
  github?: string;
  coingecko?: string;
}

export interface AssetProfile {
  price?: number;
  priceChange24h?: number;
  volume24h?: number;
  marketCap?: number;
  fdv?: number;
  circulatingSupply?: number;
  totalSupply?: number;
  description?: string;
  links?: AssetProfileLinks;
}

// ─── Risk (from ?include=risk) ────────────────────────────────────────────────

export interface AssetRiskComponent {
  score: number;
  status: string;
  hasData: boolean;
}

export interface AssetRisk {
  marketScore: {
    score: number;
    grade: string;
    label: string;
    tone: "safe" | "warning" | "danger";
    components: Record<string, AssetRiskComponent>;
  };
}

// ─── Market entry (from ?include=markets) ────────────────────────────────────

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

// ─── OHLCV (from ?include=ohlcv) ─────────────────────────────────────────────

export interface OHLCVEntry {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OHLCVData {
  ok: boolean;
  data: OHLCVEntry[];
}

// ─── Merged / flat token response ────────────────────────────────────────────

export interface TokenAssetResponse {
  // Identity
  assetId: string;
  name: string;
  symbol: string;
  category: string;
  aliases: string[];
  symbols: string[];
  imageUrl: string;

  // Stats
  stats: AssetStats;
  canonicalMarket: CanonicalMarket;
  primaryVariant: AssetVariant;

  // Variants grouped by kind
  variantGroups: VariantGroups;

  // Profile & risk
  profile: AssetProfile | null;
  risk: AssetRisk | null;

  // Markets
  markets: MarketEntry[];
  marketsTotal: number;
  marketsOffset: number;
  marketsLimit: number;
}
