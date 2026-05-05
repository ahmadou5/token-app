"use client";

import { useState, useCallback } from "react";
import { EarnProvider } from "@/context/SwapSettingsContext";

export interface EarnPosition {
  provider: EarnProvider;
  mint: string;
  symbol: string;
  amount: number;
  yieldUsd: number;
}

export function useEarnPositions() {
  const [positions, setPositions] = useState<EarnPosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simplified version that just fetches from API
  const load = useCallback(async (wallet: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/yield/positions?wallet=${wallet}`);
      const data = await res.json();
      if (data.ok) {
        setPositions(Array.isArray(data.positions) ? data.positions : []);
      } else {
        setError(data.err);
        setPositions([]);
      }
    } catch (err: unknown) {
      setError((err as { message: string }).message);
      setPositions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { positions, isLoading, error, load };
}
