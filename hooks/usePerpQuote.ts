"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface PerpQuote {
  collateralAmount: number;
  collateralToken: string;
  token: string;
  leverage?: number;
  size?: number;
  entryPrice?: number;
  liquidationPrice?: number;
  fee: number;
  takeProfit?: number | null;
  stopLoss?: number | null;
}

export type PerpQuoteStatus = "idle" | "loading" | "ready" | "error";

interface UsePerpQuoteParams {
  wallet: string | null;
  market: string; // e.g. "SOL"
  side: "long" | "short";
  collateral: number; // human-readable amount
  collateralToken: string; // e.g. "USDC" or "SOL"
  leverage: number;
  takeProfit?: string;
  stopLoss?: string;
}

interface UsePerpQuoteResult {
  quote: PerpQuote | null;
  transaction: string | null;
  status: PerpQuoteStatus;
  error: string | null;
  refetch: () => void;
}

export function usePerpQuote({
  wallet,
  market,
  side,
  collateral,
  collateralToken,
  leverage,
  takeProfit,
  stopLoss,
}: UsePerpQuoteParams): UsePerpQuoteResult {
  const [quote, setQuote] = useState<PerpQuote | null>(null);
  const [transaction, setTransaction] = useState<string | null>(null);
  const [status, setStatus] = useState<PerpQuoteStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchQuote = useCallback(async () => {
    if (!wallet || !collateral || collateral <= 0) {
      setQuote(null);
      setTransaction(null);
      setStatus("idle");
      setError(null);
      return;
    }

    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setStatus("loading");
    setError(null);

    try {
      const action = side === "long" ? "open-long" : "open-short";
      const params = new URLSearchParams({
        action,
        account: wallet,
        collateralAmount: String(collateral),
        collateralTokenSymbol: collateralToken,
        tokenSymbol: market,
        leverage: String(leverage),
        ...(takeProfit ? { takeProfit } : {}),
        ...(stopLoss ? { stopLoss } : {}),
      });

      const res = await fetch(`/api/trade/quote?${params}`, {
        signal: abortRef.current.signal,
      });
      const data = await res.json();

      if (data.ok) {
        setQuote(data.quote);
        setTransaction(data.transaction);
        setStatus("ready");
      } else {
        setError(data.error ?? "Quote failed");
        setStatus("error");
        setQuote(null);
        setTransaction(null);
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Network error");
      setStatus("error");
      setQuote(null);
      setTransaction(null);
    }
  }, [
    wallet,
    market,
    side,
    collateral,
    collateralToken,
    leverage,
    takeProfit,
    stopLoss,
  ]);

  // Debounce the fetch
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchQuote, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchQuote]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return { quote, transaction, status, error, refetch: fetchQuote };
}
