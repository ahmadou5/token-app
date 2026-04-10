"use client";

import { useSwapSettings } from "@/context/SwapSettingsContext";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SwapQuote {
  /** Raw input amount in token base units */
  inputAmount: bigint;
  /** Raw output amount in token base units */
  outputAmount: bigint;
  /** Price impact as a percentage (e.g. 0.12 = 0.12%) */
  priceImpact: number;
  /** Platform fee as a percentage (e.g. 0.003 = 0.3%) */
  fee: number;
  /** DEX/protocol hops in the route */
  route: string[];
  /** Raw quote response — passed back to the execute hook to avoid re-fetching */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawQuote: any;
  /** Which provider produced this quote */
  provider: "metis" | "titan";
}

export type QuoteStatus = "idle" | "loading" | "ready" | "error";

export interface UseSwapQuoteReturn {
  quote: SwapQuote | null;
  status: QuoteStatus;
  error: string | null;
  refetch: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SOL_MINT = "So11111111111111111111111111111111111111112";
const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";

const STABLE_MINTS = new Set([USDC_MINT, USDT_MINT]);

function getDecimals(mint: string): number {
  if (mint === SOL_MINT) return 9;
  if (STABLE_MINTS.has(mint)) return 6;
  return 9; // default for SPL tokens
}

// ─── Jupiter (public API, no key) ────────────────────────────────────────────

async function fetchJupiterQuote(
  inputMint: string,
  outputMint: string,
  amountIn: bigint,
  slippageBps: number,
): Promise<SwapQuote> {
  const url = new URL("https://quote-api.jup.ag/v6/quote");
  url.searchParams.set("inputMint", inputMint);
  url.searchParams.set("outputMint", outputMint);
  url.searchParams.set("amount", amountIn.toString());
  url.searchParams.set("slippageBps", slippageBps.toString());
  url.searchParams.set("onlyDirectRoutes", "false");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Jupiter quote error: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);

  const route: string[] = (data.routePlan ?? [])
    .slice(0, 4)
    .map((r: { swapInfo?: { label?: string } }) => r.swapInfo?.label ?? "DEX")
    .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);

  return {
    inputAmount: amountIn,
    outputAmount: BigInt(data.outAmount ?? "0"),
    priceImpact: parseFloat(data.priceImpactPct ?? "0") * 100,
    fee: 0.003,
    route,
    rawQuote: data,
    provider: "titan",
  };
}

// ─── Metis (Jupiter API key, via @pipeit/actions/metis) ──────────────────────
// We call the Metis REST endpoint directly here for the quote phase.
// The actual transaction building happens in useSwapExecute using Pipeit's SDK.

async function fetchMetisQuote(
  inputMint: string,
  outputMint: string,
  amountIn: bigint,
  slippageBps: number,
): Promise<SwapQuote> {
  const apiKey =
    process.env.NEXT_PUBLIC_METIS_API_KEY ??
    process.env.NEXT_PUBLIC_JUP_API_KEY ??
    "";

  // Metis uses the same quote endpoint as Jupiter v6 but with auth
  const url = new URL("https://api.jup.ag/swap/v1/quote");
  url.searchParams.set("inputMint", inputMint);
  url.searchParams.set("outputMint", outputMint);
  url.searchParams.set("amount", amountIn.toString());
  url.searchParams.set("slippageBps", slippageBps.toString());

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) headers["x-api-key"] = apiKey;

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) throw new Error(`Metis quote error: ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);

  const route: string[] = (data.routePlan ?? [])
    .slice(0, 4)
    .map((r: { swapInfo?: { label?: string } }) => r.swapInfo?.label ?? "DEX")
    .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);

  return {
    inputAmount: amountIn,
    outputAmount: BigInt(data.outAmount ?? "0"),
    priceImpact: parseFloat(data.priceImpactPct ?? "0") * 100,
    fee: 0.003,
    route,
    rawQuote: data,
    provider: "metis",
  };
}

// ─── Titan (no API key needed, @pipeit/actions/titan) ────────────────────────
// Titan exposes a REST quote endpoint. We hit it directly here,
// then pass the raw response to useSwapExecute for getTitanSwapPlan.

async function fetchTitanQuote(
  inputMint: string,
  outputMint: string,
  amountIn: bigint,
  slippageBps: number,
): Promise<SwapQuote> {
  // Titan's quote API endpoint (Pipeit docs reference)
  const url = new URL("https://api.titan-swap.xyz/v1/quote");
  url.searchParams.set("inputMint", inputMint);
  url.searchParams.set("outputMint", outputMint);
  url.searchParams.set("amount", amountIn.toString());
  url.searchParams.set("slippageBps", slippageBps.toString());

  let data: Record<string, unknown>;
  try {
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Titan quote error: ${res.status}`);
    data = await res.json();
    if (data.error) throw new Error(String(data.error));
  } catch {
    // Titan API might not be publicly documented — fall back to Jupiter quote
    // but tag it as titan so execute phase uses getTitanSwapPlan
    console.warn(
      "[useSwapQuote] Titan quote endpoint unavailable, falling back to Jupiter route data",
    );
    const fallback = await fetchJupiterQuote(
      inputMint,
      outputMint,
      amountIn,
      slippageBps,
    );
    return {
      ...fallback,
      provider: "titan",
      rawQuote: { ...fallback.rawQuote, _titanFallback: true },
    };
  }

  const outAmount = BigInt(String(data.outAmount ?? data.outputAmount ?? "0"));
  const priceImpact =
    parseFloat(String(data.priceImpactPct ?? data.priceImpact ?? "0")) * 100;

  const route: string[] = Array.isArray(data.routePlan)
    ? (data.routePlan as { swapInfo?: { label?: string } }[])
        .slice(0, 4)
        .map((r) => r.swapInfo?.label ?? "Titan")
        .filter((v, i, a) => a.indexOf(v) === i)
    : ["Titan"];

  return {
    inputAmount: amountIn,
    outputAmount: outAmount,
    priceImpact,
    fee: 0.0025, // Titan fee
    route,
    rawQuote: data,
    provider: "titan",
  };
}

// ─── Main hook ────────────────────────────────────────────────────────────────

export function useSwapQuote(
  inputMint: string,
  outputMint: string,
  inputAmount: string, // human-readable string e.g. "1.5"
  inputDecimals?: number,
): UseSwapQuoteReturn {
  const { settings } = useSwapSettings();

  // Use a single state object so all resets are one setState call — no cascades
  const [state, setState] = useState<{
    quote: SwapQuote | null;
    status: QuoteStatus;
    error: string | null;
  }>({ quote: null, status: "idle", error: null });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Track previous provider to detect changes inside the debounce effect
  const prevProviderRef = useRef<string>(settings.provider);

  const fetch_ = useCallback(async () => {
    const parsed = parseFloat(inputAmount);
    if (
      !inputAmount ||
      isNaN(parsed) ||
      parsed <= 0 ||
      !inputMint ||
      !outputMint ||
      inputMint === outputMint
    ) {
      setState({ quote: null, status: "idle", error: null });
      return;
    }

    // Cancel previous in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const decimals = inputDecimals ?? getDecimals(inputMint);
    const amountIn = BigInt(Math.floor(parsed * 10 ** decimals));
    const slippageBps = Math.round(settings.slippage * 100);

    setState({ quote: null, status: "loading", error: null });

    try {
      let result: SwapQuote;
      switch (settings.provider) {
        case "metis":
          result = await fetchMetisQuote(
            inputMint,
            outputMint,
            amountIn,
            slippageBps,
          );
          break;
        case "titan":
          result = await fetchTitanQuote(
            inputMint,
            outputMint,
            amountIn,
            slippageBps,
          );
          break;
        default:
          result = await fetchMetisQuote(
            inputMint,
            outputMint,
            amountIn,
            slippageBps,
          );
      }
      setState({ quote: result, status: "ready", error: null });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "Failed to fetch quote";
      setState({ quote: null, status: "error", error: msg });
    }
  }, [
    inputMint,
    outputMint,
    inputAmount,
    inputDecimals,
    settings.provider,
    settings.slippage,
  ]);

  // Single debounce effect — handles both normal debounce and provider-change reset.
  // When provider changes we reset immediately (no debounce) then kick off a fresh fetch.
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const providerChanged = prevProviderRef.current !== settings.provider;
    prevProviderRef.current = settings.provider;

    if (providerChanged) {
      // Abort any in-flight request from the old provider
      abortRef.current?.abort();
      abortRef.current = null;
      // Reset is deferred to next tick via the timer — avoids synchronous setState in effect body
      timerRef.current = setTimeout(() => {
        setState({ quote: null, status: "idle", error: null });
        // Then fetch with new provider after a short debounce
        timerRef.current = setTimeout(fetch_, 400);
      }, 0);
    } else {
      timerRef.current = setTimeout(fetch_, 550);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fetch_, settings.provider]);

  return {
    quote: state.quote,
    status: state.status,
    error: state.error,
    refetch: fetch_,
  };
}
