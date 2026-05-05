"use client";

import { useCallback, useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PortfolioToken {
  mint: string;
  symbol: string;
  name: string;
  logoUri?: string;
  balance: number;
  decimals: number;
  usdValue: number;
  usdPrice: number;
  isNative: boolean;
  isStable: boolean;
}

export interface PerpPosition {
  positionId: number;
  symbol: string;
  side: string;
  entryPrice: number | null;
  entrySize: number | null;
  entryLeverage: number | null;
  entryDate: string | null;
  collateralAmount: number | null;
}

export interface StakePosition {
  stakeAccount: string;
  validatorVoteAccount: string;
  validatorName?: string;
  stakedLamports: number;
  stakedSol: number;
  status: "active" | "activating" | "deactivating" | "inactive";
}

export interface YieldPosition {
  provider: "kamino" | "marginfi" | "drift" | "jupiter";
  mint: string;
  symbol: string;
  amount: number;
  yieldUsd: number;
  apy: number;
}

export interface PortfolioData {
  tokens: PortfolioToken[];
  stables: PortfolioToken[];
  perpPositions: PerpPosition[];
  stakePositions: StakePosition[];
  yieldPositions: YieldPosition[];
  totalUsd: number;
  totalStablUsd: number;
  totalStakedSol: number;
  totalYieldUsd: number;
  totalEstAnnualYield: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// ─── Stable detection ─────────────────────────────────────────────────────────

const STABLE_SYMBOLS = new Set([
  "USDC", "USDT", "USDG", "DAI", "USDS", "PYUSD",
  "FDUSD", "BUSD", "TUSD", "USDH", "UXD",
]);
const STABLE_MINTS = new Set([
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
]);

function isStableToken(symbol: string, mint: string): boolean {
  return (
    STABLE_SYMBOLS.has(symbol.toUpperCase()) || STABLE_MINTS.has(mint)
  );
}

// ─── Helius token fetch ───────────────────────────────────────────────────────

async function fetchHeliusAssets(wallet: string): Promise<PortfolioToken[]> {
  const rpcUrl = process.env.NEXT_PUBLIC_HELIUS_RPC_URL;
  if (!rpcUrl) throw new Error("NEXT_PUBLIC_HELIUS_RPC_URL not set");

  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "portfolio",
      method: "getAssetsByOwner",
      params: {
        ownerAddress: wallet,
        page: 1,
        limit: 1000,
        displayOptions: {
          showFungible: true,
          showNativeBalance: true,
        },
      },
    }),
  });

  const data = await res.json();
  const result = data?.result;
  if (!result) return [];

  const tokens: PortfolioToken[] = [];

  // Native SOL
  if (result.nativeBalance) {
    const lamports = result.nativeBalance.lamports ?? 0;
    const solPrice = result.nativeBalance.price_per_sol ?? 0;
    const balance = lamports / 1e9;
    const usdValue = balance * solPrice;
    tokens.push({
      mint: "So11111111111111111111111111111111111111112",
      symbol: "SOL",
      name: "Solana",
      logoUri:
        "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
      balance,
      decimals: 9,
      usdValue,
      usdPrice: solPrice,
      isNative: true,
      isStable: false,
    });
  }

  // SPL fungible tokens
  interface HeliusAsset {
    interface: string;
    id: string;
    content?: {
      metadata?: {
        name?: string;
        symbol?: string;
      };
      links?: {
        image?: string;
      };
    };
    token_info?: {
      balance?: number;
      decimals?: number;
      symbol?: string;
      name?: string;
      price_info?: {
        price_per_token?: number;
      };
    };
  }

  const items = (Array.isArray(result.items) ? result.items : []) as HeliusAsset[];

  for (const item of items) {
    if (
      item.interface !== "FungibleToken" &&
      item.interface !== "FungibleAsset"
    )
      continue;

    const tokenInfo = item.token_info || { balance: 0, decimals: 0, price_info: { price_per_token: 0 } };
    const balance =
      (tokenInfo.balance ?? 0) / Math.pow(10, tokenInfo.decimals ?? 0);
    const usdPrice = tokenInfo.price_info?.price_per_token ?? 0;
    const usdValue = balance * usdPrice;

    // Skip dust
    if (usdValue < 0.01 && balance < 1) continue;

    const symbol = tokenInfo.symbol ?? item.content?.metadata?.symbol ?? "???";
    const mint = item.id ?? "";

    tokens.push({
      mint,
      symbol,
      name: item.content?.metadata?.name ?? tokenInfo.name ?? symbol,
      logoUri: item.content?.links?.image ?? undefined,
      balance,
      decimals: tokenInfo.decimals ?? 0,
      usdValue,
      usdPrice,
      isNative: false,
      isStable: isStableToken(symbol, mint),
    });
  }

  // Sort: native first, then by USD value desc
  return tokens.sort((a, b) => {
    if (a.isNative && !b.isNative) return -1;
    if (!a.isNative && b.isNative) return 1;
    return b.usdValue - a.usdValue;
  });
}

// ─── Perp positions fetch ─────────────────────────────────────────────────────

async function fetchPerpPositions(wallet: string): Promise<PerpPosition[]> {
  try {
    const res = await fetch(`/api/trade?wallet=${wallet}`, {
      cache: "no-store",
    });
    const data = await res.json();
    return data?.openPositions ?? [];
  } catch {
    return [];
  }
}

async function fetchYieldPositions(wallet: string): Promise<YieldPosition[]> {
  try {
    const res = await fetch(`/api/yield/positions?wallet=${wallet}`, {
      cache: "no-store",
    });
    const data = await res.json();
    if (!data?.ok || !Array.isArray(data.positions)) return [];
    return data.positions as YieldPosition[];
  } catch {
    return [];
  }
}

// ─── Stake positions fetch ────────────────────────────────────────────────────

async function fetchStakePositions(
  wallet: string,
): Promise<StakePosition[]> {
  const rpcUrl =
    process.env.NEXT_PUBLIC_HELIUS_RPC_URL ??
    "https://api.mainnet-beta.solana.com";

  try {
    const [stakeData, validatorRes] = await Promise.all([
      fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "stake",
          method: "getProgramAccounts",
          params: [
            "Stake11111111111111111111111111111111111111",
            {
              encoding: "jsonParsed",
              filters: [
                {
                  memcmp: {
                    offset: 44,
                    bytes: wallet,
                  },
                },
              ],
            },
          ],
        }),
      }).then((r) => r.json()),
      fetch("/api/validators").then((r) => (r.ok ? r.json() : { validators: [] })),
    ]);

    interface HeliusStakeAccount {
      pubkey: string;
      account: {
        lamports: number;
        data: {
          parsed?: {
            info?: {
              stake?: {
                delegation?: {
                  voter?: string;
                  activationEpoch?: string;
                  deactivationEpoch?: string;
                };
              };
            };
          };
        };
      };
    }

    const accounts = (
      Array.isArray(stakeData?.result) ? stakeData.result : []
    ) as HeliusStakeAccount[];

    const validatorMap = new Map<string, string>();
    const validators = (
      Array.isArray(validatorRes?.validators) ? validatorRes.validators : []
    ) as Array<{ votingPubkey?: string; name?: string }>;

    validators.forEach((v) => {
      const vote = v.votingPubkey ?? "";
      const name = v.name ?? "";
      if (vote) validatorMap.set(vote, name);
    });

    return accounts
      .map((acc): StakePosition | null => {
        const parsed = acc.account.data.parsed?.info;
        if (!parsed) return null;

        const lamports = acc.account.lamports;
        const stakedSol = lamports / 1e9;
        const voteAccount = parsed.stake?.delegation?.voter ?? "";
        const activationEpoch = parsed.stake?.delegation?.activationEpoch;
        const deactivationEpoch = parsed.stake?.delegation?.deactivationEpoch;

        let status: StakePosition["status"] = "active";
        if (deactivationEpoch !== "18446744073709551615") {
          status = "deactivating";
        } else if (!activationEpoch) {
          status = "activating";
        }

        return {
          stakeAccount: acc.pubkey,
          validatorVoteAccount: voteAccount,
          validatorName: validatorMap.get(voteAccount),
          stakedLamports: lamports,
          stakedSol,
          status,
        };
      })
      .filter(Boolean) as StakePosition[];
  } catch {
    return [];
  }
}

// ─── Main hook ────────────────────────────────────────────────────────────────

export function usePortfolioData(wallet: string | null): PortfolioData {
  const [tokens, setTokens] = useState<PortfolioToken[]>([]);
  const [perpPositions, setPerpPositions] = useState<PerpPosition[]>([]);
  const [stakePositions, setStakePositions] = useState<StakePosition[]>([]);
  const [yieldPositions, setYieldPositions] = useState<YieldPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchAll = useCallback(async () => {
    if (!wallet) {
      setTokens([]);
      setPerpPositions([]);
      setStakePositions([]);
      setYieldPositions([]);
      return;
    }

    setLoading(true);
    setError(null);

    const [tokensResult, perpResult, stakeResult, yieldResult] =
      await Promise.allSettled([
        fetchHeliusAssets(wallet),
        fetchPerpPositions(wallet),
        fetchStakePositions(wallet),
        fetchYieldPositions(wallet),
      ]);

    if (tokensResult.status === "fulfilled") setTokens(tokensResult.value);
    else setError("Failed to load token balances");

    if (perpResult.status === "fulfilled")
      setPerpPositions(perpResult.value);

    if (stakeResult.status === "fulfilled")
      setStakePositions(stakeResult.value);

    if (yieldResult.status === "fulfilled")
      setYieldPositions(yieldResult.value);

    setLoading(false);
  }, [wallet]);

  // Fetch when wallet changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchAll();
  }, [fetchAll]);

  const stables = tokens.filter((t) => t.isStable);
  const totalYieldUsd = yieldPositions.reduce((s, p) => s + p.yieldUsd, 0);
  const totalEstAnnualYield = yieldPositions.reduce(
    (s, p) => s + p.yieldUsd * (p.apy / 100),
    0,
  );
  const totalStakedSol = stakePositions.reduce((s, p) => s + p.stakedSol, 0);
  const totalUsd = tokens.reduce((s, t) => s + t.usdValue, 0) + totalYieldUsd;
  const totalStablUsd = stables.reduce((s, t) => s + t.usdValue, 0);

  return {
    tokens,
    stables,
    perpPositions,
    stakePositions,
    yieldPositions,
    totalUsd,
    totalStablUsd,
    totalStakedSol,
    totalYieldUsd,
    totalEstAnnualYield,
    loading,
    error,
    refetch: fetchAll,
  };
}
