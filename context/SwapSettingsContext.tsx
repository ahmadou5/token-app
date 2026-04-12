"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

// ─── Spot provider types (unchanged) ─────────────────────────────────────────

export type SwapProvider = "metis" | "titan";
export type ExecutionStrategy = "standard" | "economical" | "fast";

export const PROVIDER_META: Record<
  SwapProvider,
  {
    label: string;
    badge?: string;
    description: string;
    supportsExecution: boolean;
  }
> = {
  metis: {
    label: "Jupiter Metis",
    badge: "Default",
    description: "Best routes via Jupiter's Metis engine with Pipeit execution.",
    supportsExecution: true,
  },
  titan: {
    label: "Titan",
    badge: "MEV",
    description: "MEV-protected execution via Titan's private mempool.",
    supportsExecution: true,
  },
};

export const EXECUTION_META: Record<
  ExecutionStrategy,
  { label: string; description: string; icon: string }
> = {
  standard: {
    label: "Standard",
    description: "Balanced speed and cost for most trades.",
    icon: "⚖️",
  },
  economical: {
    label: "Economical",
    description: "Lower fees, slightly slower confirmation.",
    icon: "🪙",
  },
  fast: {
    label: "Fast",
    description: "Higher priority fee for quicker inclusion.",
    icon: "⚡",
  },
};

// ─── Perp provider types ──────────────────────────────────────────────────────

export type PerpProvider = "adrena" | "flash";

export const PERP_PROVIDER_META: Record<
  PerpProvider,
  {
    label: string;
    badge?: string;
    description: string;
  }
> = {
  adrena: {
    label: "Adrena Protocol",
    badge: "Default",
    description:
      "Decentralised perpetuals on Solana. SOL, BTC, ETH, BONK, JTO markets.",
  },
  flash: {
    label: "Flash Trade",
    badge: "New",
    description:
      "High-performance perps with up to 500× leverage across 11 markets.",
  },
};

// ─── Settings shape ───────────────────────────────────────────────────────────

export interface SwapSettings {
  // Spot
  provider: SwapProvider;
  executionStrategy: ExecutionStrategy;
  slippage: number;
  // Perp
  perpProvider: PerpProvider;
}

const DEFAULT_SETTINGS: SwapSettings = {
  provider: "metis",
  executionStrategy: "standard",
  slippage: 0.5,
  perpProvider: "adrena",
};

// ─── Context ──────────────────────────────────────────────────────────────────

interface SwapSettingsContextValue {
  settings: SwapSettings;
  setProvider: (p: SwapProvider) => void;
  setExecutionStrategy: (s: ExecutionStrategy) => void;
  setSlippage: (v: number) => void;
  setPerpProvider: (p: PerpProvider) => void;
  resetSettings: () => void;
}

const SwapSettingsContext = createContext<SwapSettingsContextValue | null>(null);

const STORAGE_KEY = "swap_settings_v2";

export function SwapSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<SwapSettings>(() => {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_SETTINGS;
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings]);

  const setProvider = useCallback(
    (p: SwapProvider) => setSettings((s) => ({ ...s, provider: p })),
    [],
  );
  const setExecutionStrategy = useCallback(
    (es: ExecutionStrategy) =>
      setSettings((s) => ({ ...s, executionStrategy: es })),
    [],
  );
  const setSlippage = useCallback(
    (v: number) => setSettings((s) => ({ ...s, slippage: v })),
    [],
  );
  const setPerpProvider = useCallback(
    (p: PerpProvider) => setSettings((s) => ({ ...s, perpProvider: p })),
    [],
  );
  const resetSettings = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  return (
    <SwapSettingsContext.Provider
      value={{
        settings,
        setProvider,
        setExecutionStrategy,
        setSlippage,
        setPerpProvider,
        resetSettings,
      }}
    >
      {children}
    </SwapSettingsContext.Provider>
  );
}

export function useSwapSettings() {
  const ctx = useContext(SwapSettingsContext);
  if (!ctx)
    throw new Error("useSwapSettings must be used within SwapSettingsProvider");
  return ctx;
}