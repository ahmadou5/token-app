"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Icon, LightningAIcon, ClockIcon, CoinVerticalIcon, CoinIcon } from "@phosphor-icons/react";
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
  { label: string; description: string; icon: Icon }
> = {
  standard: {
    label: "Standard",
    description: "Balanced speed and cost for most trades.",
    icon: ClockIcon,
  },
  economical: {
    label: "Economical",
    description: "Lower fees, slightly slower confirmation.",
    icon: CoinVerticalIcon,
  },
  fast: {
    label: "Fast",
    description: "Higher priority fee for quicker inclusion.",
    icon: LightningAIcon,
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

// ─── Earn provider types ──────────────────────────────────────────────────────

export type EarnProvider = "kamino" | "marginfi" | "drift" | "jupiter";

export const EARN_PROVIDER_META: Record<
  EarnProvider,
  {
    label: string;
    badge?: string | null;
    description: string;
    apiBase: string;
  }
> = {
  kamino: {
    label: "Kamino Finance",
    badge: "Default",
    description: "Automated liquidity vaults. Single-sided stable deposits.",
    apiBase: "https://api.kamino.finance",
  },
  marginfi: {
    label: "MarginFi",
    badge: null,
    description: "Lending protocol. Earn interest by supplying stables.",
    apiBase: "https://marginfi.com/api",
  },
  drift: {
    label: "Drift Protocol",
    badge: null,
    description: "Spot + perp DEX. Earn yield on idle stable collateral.",
    apiBase: "https://drift-public-api.drift.trade",
  },
  jupiter: {
    label: "Jupiter Earn",
    badge: "High TVL",
    description: "Yield-generating vaults powered by Jupiter's lending engine.",
    apiBase: "https://api.jup.ag",
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
  // Earn
  earnProvider: EarnProvider;
}

const DEFAULT_SETTINGS: SwapSettings = {
  provider: "metis",
  executionStrategy: "standard",
  slippage: 0.5,
  perpProvider: "adrena",
  earnProvider: "kamino",
};

// ─── Context ──────────────────────────────────────────────────────────────────

interface SwapSettingsContextValue {
  settings: SwapSettings;
  setProvider: (p: SwapProvider) => void;
  setExecutionStrategy: (s: ExecutionStrategy) => void;
  setSlippage: (v: number) => void;
  setPerpProvider: (p: PerpProvider) => void;
  setEarnProvider: (p: EarnProvider) => void;
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
  const setEarnProvider = useCallback(
    (p: EarnProvider) => setSettings((s) => ({ ...s, earnProvider: p })),
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
        setEarnProvider,
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