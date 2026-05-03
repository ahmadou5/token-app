"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export interface RebalanceSettings {
  enabled: boolean;
  maxAllocationPctPerAsset: number;
  driftThresholdPct: number;
  checkIntervalHours: number;
}

const DEFAULT_SETTINGS: RebalanceSettings = {
  enabled: false,
  maxAllocationPctPerAsset: 45,
  driftThresholdPct: 8,
  checkIntervalHours: 24,
};

interface RebalanceSettingsContextValue {
  settings: RebalanceSettings;
  update: (next: Partial<RebalanceSettings>) => void;
  reset: () => void;
}

const RebalanceSettingsContext =
  createContext<RebalanceSettingsContextValue | null>(null);

export function RebalanceSettingsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<RebalanceSettings>(DEFAULT_SETTINGS);

  const update = useCallback((next: Partial<RebalanceSettings>) => {
    setSettings((prev) => ({ ...prev, ...next }));
  }, []);

  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), []);

  const value = useMemo(() => ({ settings, update, reset }), [settings, update, reset]);

  return (
    <RebalanceSettingsContext.Provider value={value}>
      {children}
    </RebalanceSettingsContext.Provider>
  );
}

export function useRebalanceSettings() {
  const ctx = useContext(RebalanceSettingsContext);
  if (!ctx) {
    throw new Error("useRebalanceSettings must be used within RebalanceSettingsProvider");
  }
  return ctx;
}
