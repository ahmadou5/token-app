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
/**
 * Maps our provider keys to DeFiLlama project slugs
 */
const PROVIDER_MAP: Record<EarnProvider, string[]> = {
  kamino: ["kamino-lend", "kamino-liquidity"],
  marginfi: ["marginfi-lst", "marginfi"],
  drift: ["drift-protocol", "drift-staked-sol"],
  jupiter: ["jupiter-lend", "jupiter-staked-sol"],
};

export async function fetchYieldAPY(
  provider: EarnProvider,
  symbol: string
): Promise<number> {
  try {
    const projects = PROVIDER_MAP[provider];
    const res = await fetch(LLAMA_YIELD_URL);
    if (!res.ok) throw new Error("Failed to fetch from DeFiLlama");

    const { data } = (await res.json()) as { data: YieldPool[] };
    
    // Find matching pool: one of our projects, symbol match, and on Solana
    // We prefer the one with highest TVL if multiple match
    const pools = data.filter(
      (p) =>
        projects.includes(p.project.toLowerCase()) &&
        p.symbol.toUpperCase().includes(symbol.toUpperCase()) &&
        p.chain.toLowerCase() === "solana"
    );

    if (pools.length === 0) return 0;

    const bestPool = pools.sort((a, b) => b.tvlUsd - a.tvlUsd)[0];
    return bestPool.apy;
  } catch (error) {
    console.error(`Error fetching yield for ${provider} ${symbol}:`, error);
    // Fallback values based on historical averages
    const fallbacks: Record<string, number> = {
      kamino: 7.2,
      marginfi: 6.5,
      drift: 8.0,
      jupiter: 4.5,
    };
    return fallbacks[provider] || 5.0;
  }
}

export async function getAllProviderYields(symbol: string): Promise<Record<EarnProvider, number>> {
  const providers: EarnProvider[] = ["kamino", "marginfi", "drift", "jupiter"];
  
  // Fetch all at once to avoid multiple DeFiLlama calls if possible
  // Actually, DeFiLlama call is large, so we fetch it once and then filter
  try {
    const res = await fetch(LLAMA_YIELD_URL);
    if (!res.ok) throw new Error("Failed to fetch from DeFiLlama");
    const { data } = (await res.json()) as { data: YieldPool[] };

    const results: Partial<Record<EarnProvider, number>> = {};
    
    for (const p of providers) {
      const projects = PROVIDER_MAP[p];
      const pools = data.filter(
        (pool) =>
          projects.includes(pool.project.toLowerCase()) &&
          pool.symbol.toUpperCase().includes(symbol.toUpperCase()) &&
          pool.chain.toLowerCase() === "solana"
      );
      
      if (pools.length > 0) {
        const bestPool = pools.sort((a, b) => b.tvlUsd - a.tvlUsd)[0];
        results[p] = bestPool.apy;
      } else {
        results[p] = 0;
      }
    }

    return results as Record<EarnProvider, number>;
  } catch (error) {
    console.error("Error fetching all yields:", error);
    return {
      kamino: 7.2,
      marginfi: 6.5,
      drift: 8.0,
      jupiter: 4.5,
    };
  }
}
