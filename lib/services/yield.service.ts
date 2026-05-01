import { EarnProvider } from "@/context/SwapSettingsContext";

interface YieldPool {
  pool: string;
  project: string;
  symbol: string;
  chain: string;
  apy: number;
  tvlUsd: number;
  rewardTokens: string[] | null;
}

const LLAMA_YIELD_URL = "https://yields.llama.fi/pools";

/**
 * Maps our provider keys to DeFiLlama project slugs
 */
const PROVIDER_MAP: Record<EarnProvider, string> = {
  kamino: "kamino",
  marginfi: "marginfi",
  drift: "drift",
};

export async function fetchYieldAPY(
  provider: EarnProvider,
  symbol: string
): Promise<number> {
  try {
    const project = PROVIDER_MAP[provider];
    const res = await fetch(LLAMA_YIELD_URL);
    if (!res.ok) throw new Error("Failed to fetch from DeFiLlama");

    const { data } = (await res.json()) as { data: YieldPool[] };
    
    // Find matching pool: project, symbol, and on Solana
    const pool = data.find(
      (p) =>
        p.project.toLowerCase() === project &&
        p.symbol.toUpperCase() === symbol.toUpperCase() &&
        p.chain.toLowerCase() === "solana"
    );

    return pool ? pool.apy : 0;
  } catch (error) {
    console.error(`Error fetching yield for ${provider} ${symbol}:`, error);
    // Fallback values based on historical averages if API fails
    const fallbacks: Record<string, number> = {
      kamino: 7.2,
      marginfi: 6.5,
      drift: 8.0,
    };
    return fallbacks[provider] || 5.0;
  }
}

export async function getAllProviderYields(symbol: string): Promise<Record<EarnProvider, number>> {
  const providers: EarnProvider[] = ["kamino", "marginfi", "drift"];
  const results = await Promise.all(
    providers.map(async (p) => {
      const apy = await fetchYieldAPY(p, symbol);
      return { provider: p, apy };
    })
  );

  return results.reduce(
    (acc, curr) => ({ ...acc, [curr.provider]: curr.apy }),
    {} as Record<EarnProvider, number>
  );
}
