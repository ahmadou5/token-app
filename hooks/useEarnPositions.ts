"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/connector";
import { EarnProvider } from "@/context/SwapSettingsContext";

export interface EarnPosition {
  provider: EarnProvider;
  mint: string;
  symbol: string;
  amount: number;
  yieldUsd: number;
}

export function useEarnPositions() {
  const { isConnected } = useWallet();
  const [positions, setPositions] = useState<EarnPosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPositions = useCallback(async () => {
    // Only fetch if wallet is connected. The connector might not expose the pubkey directly in some cases,
    // so we check isConnected and use the address if available.
    // In this app, we can get the address from useConnector().account or similar.
    // Based on SpotSwap.tsx, connector.account is the pubkey.
    
    // We'll use a window event or just poll for now as simplified.
    // For this implementation, we'll just fetch once on mount if connected.
  }, []);

  // Simplified version that just fetches from API
  const load = useCallback(async (wallet: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/yield/positions?wallet=${wallet}`);
      const data = await res.json();
      if (data.ok) {
        setPositions(data.positions);
      } else {
        setError(data.err);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { positions, isLoading, error, load };
}
