"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { PerpProvider } from "@/context/SwapSettingsContext";

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
  // Flash-specific extras (optional — used by PerpQuoteDetails when present)
  availableLiquidity?: string;
  youPayUsdUi?: string;
  youReceiveUsdUi?: string;
  openPositionFeePercent?: string;
  marginFeePercentage?: string;
  takeProfitQuote?: {
    exitPriceUi: string;
    profitUsdUi: string;
    lossUsdUi: string;
    exitFeeUsdUi: string;
    receiveUsdUi: string;
    pnlPercentage: string;
  } | null;
  stopLossQuote?: {
    exitPriceUi: string;
    profitUsdUi: string;
    lossUsdUi: string;
    exitFeeUsdUi: string;
    receiveUsdUi: string;
    pnlPercentage: string;
  } | null;
}

export type PerpQuoteStatus = "idle" | "loading" | "ready" | "error";

interface UsePerpQuoteParams {
  wallet: string | null;
  market: string;
  side: "long" | "short";
  collateral: number;
  collateralToken: string;
  leverage: number;
  takeProfit?: string;
  stopLoss?: string;
  perpProvider: PerpProvider;
}

interface UsePerpQuoteResult {
  quote: PerpQuote | null;
  transaction: string | null;
  status: PerpQuoteStatus;
  error: string | null;
  refetch: () => void;
}

// ── Build request for each provider ──────────────────────────────────────────

function buildAdrenaParams(params: UsePerpQuoteParams): URLSearchParams {
  const action = params.side === "long" ? "open-long" : "open-short";
  return new URLSearchParams({
    action,
    account: params.wallet!,
    collateralAmount: String(params.collateral),
    collateralTokenSymbol: params.collateralToken,
    tokenSymbol: params.market,
    leverage: String(params.leverage),
    ...(params.takeProfit ? { takeProfit: params.takeProfit } : {}),
    ...(params.stopLoss ? { stopLoss: params.stopLoss } : {}),
  });
}

function buildFlashBody(params: UsePerpQuoteParams): object {
  return {
    inputTokenSymbol: params.collateralToken,
    outputTokenSymbol: params.market,
    inputAmountUi: String(params.collateral),
    leverage: params.leverage,
    tradeType: params.side === "long" ? "LONG" : "SHORT",
    owner: params.wallet,
    slippagePercentage: "0.5",
    ...(params.takeProfit ? { takeProfit: params.takeProfit } : {}),
    ...(params.stopLoss ? { stopLoss: params.stopLoss } : {}),
  };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function usePerpQuote(params: UsePerpQuoteParams): UsePerpQuoteResult {
  const [quote, setQuote] = useState<PerpQuote | null>(null);
  const [transaction, setTransaction] = useState<string | null>(null);
  const [status, setStatus] = useState<PerpQuoteStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchQuote = useCallback(async () => {
    if (!params.wallet || !params.collateral || params.collateral <= 0) {
      setQuote(null);
      setTransaction(null);
      setStatus("idle");
      setError(null);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setStatus("loading");
    setError(null);

    try {
      let res: Response;

      if (params.perpProvider === "flash") {
        // Flash Trade — POST to our backend proxy
        res = await fetch("/api/perp/flash/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildFlashBody(params)),
          signal: abortRef.current.signal,
        });
      } else {
        // Adrena — GET to existing /api/perp/adrena/quote
        const searchParams = buildAdrenaParams(params);
        res = await fetch(`/api/perp/adrena/quote?${searchParams}`, {
          signal: abortRef.current.signal,
        });
      }

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
  }, [params]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchQuote, 13000);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchQuote]);

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return { quote, transaction, status, error, refetch: fetchQuote };
}
