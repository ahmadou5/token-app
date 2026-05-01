import { useCallback, useEffect, useState } from "react";
import { tokenRequest } from "@/lib/token";
import { RawOHLCVTuple } from "@/types";

export type OHLCVInterval = "1H" | "4H" | "1D" | "1W";
export type OHLCVTimeframe = "24H" | "7D" | "30D" | "90D" | "1Y";

export interface OHLCVCandle {
  time: number; // unix ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface UseOHLCVReturn {
  candles: OHLCVCandle[];
  isLoading: boolean;
  error: Error | null;
  interval: OHLCVInterval;
  timeframe: OHLCVTimeframe;
  setInterval: (i: OHLCVInterval) => void;
  setTimeframe: (t: OHLCVTimeframe) => void;
}

// Map timeframe → appropriate interval + limit
const TIMEFRAME_CONFIG: Record<
  OHLCVTimeframe,
  { interval: OHLCVInterval; limit: number }
> = {
  "24H": { interval: "1H", limit: 24 },
  "7D": { interval: "4H", limit: 42 }, // 7 days × 6 candles/day
  "30D": { interval: "1D", limit: 30 },
  "90D": { interval: "1D", limit: 90 },
  "1Y": { interval: "1W", limit: 52 },
};
export function useOHLCV(
  assetId: string | null,
  mint: string | null = null,
): UseOHLCVReturn {
  const [candles, setCandles] = useState<OHLCVCandle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [timeframe, setTimeframeState] = useState<OHLCVTimeframe>("7D");

  const fetchCandles = useCallback(async () => {
    if (!assetId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { interval } = TIMEFRAME_CONFIG[timeframe];

      // Use the new getVariant API which returns the exact structure requested
      let url = `/api/getVariant?assetId=${assetId}&ohlcvInterval=${interval}&include=ohlcv`;
      if (mint) url += `&mint=${mint}`;

      // For timeframe calculation, we might need 'from'/'to' but the configurator uses limit
      // Let's stick to the configuration we have or map limit to from/to
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch OHLCV");
      const json = await res.json();

      const ohlcvData = json.includes?.ohlcv?.data || [];

      const parsed: OHLCVCandle[] = ohlcvData.map((c: any) => ({
        time: c.time * 1000,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
      }));

      setCandles(parsed);
    } catch (err) {
      console.error("OHLCV Fetch Error:", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch OHLCV"));
      setCandles([]);
    } finally {
      setIsLoading(false);
    }
  }, [assetId, mint, timeframe]);

  useEffect(() => {
    fetchCandles();
  }, [fetchCandles]);

  return {
    candles,
    isLoading,
    error,
    interval: TIMEFRAME_CONFIG[timeframe].interval,
    timeframe,
    setInterval: () => {},
    setTimeframe: setTimeframeState,
  };
}
