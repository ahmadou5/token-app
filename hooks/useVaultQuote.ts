import { useState, useEffect, useCallback } from "react";
import { EarnProvider } from "@/context/SwapSettingsContext";

interface VaultQuote {
  apy: number;
  dailyEarningsUsd: number;
  protocolFeePercent: number;
  provider: EarnProvider;
}

interface UseVaultQuoteProps {
  provider: EarnProvider;
  mint: string;
  symbol: string;
  amountUi: string;
  owner?: string;
  action: "deposit" | "withdraw";
}

interface VaultQuoteResponse {
  ok: boolean;
  quote?: VaultQuote;
  transaction?: string | null;
  executionAvailable?: boolean;
  note?: string;
  err?: string | null;
}

export function useVaultQuote({
  provider,
  mint,
  symbol,
  amountUi,
  owner,
  action,
}: UseVaultQuoteProps) {
  const [quote, setQuote] = useState<VaultQuote | null>(null);
  const [transaction, setTransaction] = useState<string | null>(null);
  const [executionAvailable, setExecutionAvailable] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuote = useCallback(async () => {
    if (!mint || !amountUi || parseFloat(amountUi) <= 0) {
      setQuote(null);
      setTransaction(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/yield/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          mint,
          symbol,
          amountUi,
          owner,
          action,
        }),
      });

      const data = (await res.json()) as VaultQuoteResponse;

      if (data.ok) {
        setQuote(data.quote);
        setTransaction(data.transaction ?? null);
        setExecutionAvailable(Boolean(data.executionAvailable && data.transaction));
        setNote(data.note ?? null);
      } else {
        setError(data.err || "Failed to fetch quote");
        setQuote(null);
        setTransaction(null);
        setExecutionAvailable(false);
        setNote(null);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
      setQuote(null);
      setTransaction(null);
      setExecutionAvailable(false);
      setNote(null);
    } finally {
      setIsLoading(false);
    }
  }, [provider, mint, symbol, amountUi, owner, action]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchQuote();
    }, 500); // Debounce

    return () => clearTimeout(timer);
  }, [fetchQuote]);

  return {
    quote,
    transaction,
    executionAvailable,
    note,
    isLoading,
    error,
    refetch: fetchQuote,
  };
}
