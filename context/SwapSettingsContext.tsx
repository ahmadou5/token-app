"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SwapProvider = "metis" | "titan";

export type ExecutionStrategy = "standard" | "economical" | "fast";

export interface SwapSettings {
  provider: SwapProvider;
  executionStrategy: ExecutionStrategy;
  slippage: number; // in percent e.g. 0.5
}

interface SwapSettingsContextValue {
  settings: SwapSettings;
  setProvider: (p: SwapProvider) => void;
  setExecutionStrategy: (s: ExecutionStrategy) => void;
  setSlippage: (s: number) => void;
  resetSettings: () => void;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: SwapSettings = {
  provider: "metis",
  executionStrategy: "standard",
  slippage: 0.5,
};

const STORAGE_KEY = "token-app:swap-settings";

// ─── Context ──────────────────────────────────────────────────────────────────

const SwapSettingsContext = createContext<SwapSettingsContextValue | null>(
  null,
);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function SwapSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SwapSettings>(() => {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_SETTINGS;
      const parsed = JSON.parse(raw) as Partial<SwapSettings>;
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Persist to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  const setProvider = useCallback((provider: SwapProvider) => {
    setSettings((s) => ({
      ...s,
      provider,
      // Reset execution strategy to standard when switching to Jupiter
      // (Jupiter direct doesn't use Pipeit TransactionBuilder strategies)
      executionStrategy:
        provider === "metis" ? "standard" : s.executionStrategy,
    }));
  }, []);

  const setExecutionStrategy = useCallback(
    (executionStrategy: ExecutionStrategy) => {
      setSettings((s) => ({ ...s, executionStrategy }));
    },
    [],
  );

  const setSlippage = useCallback((slippage: number) => {
    setSettings((s) => ({ ...s, slippage }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <SwapSettingsContext.Provider
      value={{
        settings,
        setProvider,
        setExecutionStrategy,
        setSlippage,
        resetSettings,
      }}
    >
      {children}
    </SwapSettingsContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSwapSettings(): SwapSettingsContextValue {
  const ctx = useContext(SwapSettingsContext);
  if (!ctx)
    throw new Error(
      "useSwapSettings must be used inside <SwapSettingsProvider>",
    );
  return ctx;
}

// ─── Provider metadata (for UI) ───────────────────────────────────────────────

export const PROVIDER_META: Record<
  SwapProvider,
  {
    label: string;
    description: string;
    badge?: string;
    supportsExecution: boolean;
  }
> = {
  metis: {
    label: "Metis",
    description:
      "Jupiter API via Pipeit — advanced routing with execution strategies.",
    badge: "Pipeit",
    supportsExecution: true,
  },
  titan: {
    label: "Titan",
    description:
      "Titan aggregator via Pipeit — MEV-protected routes, no API key needed.",
    badge: "Pipeit",
    supportsExecution: true,
  },
};

export const EXECUTION_META: Record<
  ExecutionStrategy,
  {
    label: string;
    description: string;
    icon: string;
  }
> = {
  standard: {
    label: "Standard",
    description: "Default RPC submission. Reliable for most transactions.",
    icon: "⚡",
  },
  economical: {
    label: "Economical",
    description: "Jito bundle only. Lower fees, MEV-sensitive swaps.",
    icon: "💰",
  },
  fast: {
    label: "Fast",
    description: "Jito + parallel RPC race. Best for time-sensitive swaps.",
    icon: "🚀",
  },
};
