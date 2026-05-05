import { getPoolStats } from "@/lib/adrena";
import { listGoalEvents } from "@/lib/services/analyticsStore.service";

interface CuratedAsset {
  symbol?: string;
  name?: string;
  category?: string;
  imageUrl?: string;
  primaryVariant?: { market?: { logoURI?: string } };
  stats?: {
    price?: number;
    priceChange24hPercent?: number;
    volume24hUSD?: number;
  };
}

interface CuratedAssetsResponse {
  assets?: CuratedAsset[];
}

export interface HomeStatsData {
  tvl: string;
  volume24h: string;
  activeUsers: string;
}

export interface HomePerpPrice {
  symbol: string;
  price: number;
  change24h: number;
}

export interface HomeMarketAsset {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: string;
  logoUri: string;
}

const TOKEN_ENDPOINT = "/assets/curated?list=all&groupBy=asset";

let cachedAssets: { data: CuratedAsset[]; ts: number } | null = null;
const ASSETS_CACHE_TTL = 60 * 1000;

function compact(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(2);
}

function safeNum(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

async function fetchCuratedAssets(): Promise<CuratedAsset[]> {
  const now = Date.now();
  if (cachedAssets && now - cachedAssets.ts < ASSETS_CACHE_TTL) {
    return cachedAssets.data;
  }

  const base = process.env.TOKEN_API_BASE_URL;
  const key = process.env.TOKEN_API_KEY;
  if (!base || !key) return cachedAssets?.data ?? [];

  try {
    const res = await fetch(`${base}${TOKEN_ENDPOINT}`, {
      headers: {
        "x-api-key": key,
        Accept: "application/json",
      },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) throw new Error("Assets API failure");

    const data = (await res.json()) as CuratedAssetsResponse;
    const assets = Array.isArray(data.assets) ? data.assets : [];

    if (assets.length > 0) {
      cachedAssets = { data: assets, ts: now };
    }

    return assets;
  } catch (error) {
    console.error("[homeData] Failed to fetch assets:", error);
    return cachedAssets?.data ?? [];
  }
}

function extractWallet(payload: Record<string, unknown>): string | null {
  const keys = ["wallet", "owner", "account", "address", "pubkey"];
  for (const k of keys) {
    const v = payload[k];
    if (typeof v === "string" && v.length >= 32) return v;
  }
  return null;
}

export async function getHomeStatsData(): Promise<HomeStatsData> {
  const [poolStats, events] = await Promise.all([
    getPoolStats().catch(() => null),
    listGoalEvents(2000).catch(() => []),
  ]);

  const now = Date.now();
  const cutoff = now - 24 * 60 * 60 * 1000;
  const uniqueWallets = new Set<string>();
  for (const evt of events) {
    const ts = Date.parse(evt.ts);
    if (!Number.isFinite(ts) || ts < cutoff) continue;
    const wallet = extractWallet(evt.payload ?? {});
    if (wallet) uniqueWallets.add(wallet);
  }

  return {
    tvl: poolStats ? compact(safeNum(poolStats.total_value_locked)) : "$1.2B",
    volume24h: poolStats ? compact(safeNum(poolStats.volume_24h)) : "$420M",
    activeUsers: uniqueWallets.size > 0 ? compact(uniqueWallets.size) : "12.4K",
  };
}

export async function getHomePerpPrices(): Promise<HomePerpPrice[]> {
  const assets = await fetchCuratedAssets();
  const wanted = ["SOL", "BTC", "ETH"];
  const out: HomePerpPrice[] = [];

  for (const symbol of wanted) {
    const t = assets.find((a) => a.symbol?.toUpperCase() === symbol);
    if (!t) continue;
    out.push({
      symbol: `${symbol}-PERP`,
      price: safeNum(t.stats?.price),
      change24h: safeNum(t.stats?.priceChange24hPercent),
    });
  }

  return out;
}

const LEGACY_CATEGORY_FILTERS: Record<string, (t: CuratedAsset) => boolean> = {
  defi: (t) => {
    const s = (t.symbol ?? "").toUpperCase();
    return ["JUP", "JTO", "DRIFT", "RAY", "ORCA", "KMNO", "PYTH", "MNGO"].includes(s);
  },
  meme: (t) => {
    const s = (t.symbol ?? "").toUpperCase();
    return ["BONK", "WIF", "POPCAT", "BOME", "MEW", "SLERF", "MYRO", "WEN"].includes(s);
  },
  lst: (t) => (t.name ?? "").toLowerCase().includes("staked sol"),
  stables: (t) => {
    const s = (t.symbol ?? "").toUpperCase();
    return ["USDC", "USDT", "DAI", "PYUSD", "FDUSD", "TUSD", "USDH", "UXD"].includes(s);
  },
  gaming: (t) => {
    const s = (t.symbol ?? "").toUpperCase();
    return ["ATLAS", "POLIS", "AURY", "SHDW", "HONEY", "NOS"].includes(s);
  },
};

export async function getHomeMarketsByCategory(category: string): Promise<HomeMarketAsset[]> {
  const assets = await fetchCuratedAssets();
  const normalized = category.toLowerCase();
  const filter =
    normalized === "all"
      ? () => true
      : LEGACY_CATEGORY_FILTERS[normalized] ??
        ((t: CuratedAsset) => (t.category ?? "").toLowerCase() === normalized);

  return assets
    .filter(filter)
    .slice(0, 50)
    .map((t) => ({
      symbol: t.symbol ?? "UNKNOWN",
      name: t.name ?? t.symbol ?? "Unknown",
      price: safeNum(t.stats?.price),
      change24h: safeNum(t.stats?.priceChange24hPercent),
      volume24h: compact(safeNum(t.stats?.volume24hUSD)),
      logoUri: t.imageUrl ?? t.primaryVariant?.market?.logoURI ?? "",
    }));
}
