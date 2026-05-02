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

// Map timeframe → appropriate interval + limit + duration (seconds)
const TIMEFRAME_CONFIG: Record<
  OHLCVTimeframe,
  { interval: OHLCVInterval; limit: number; duration: number }
> = {
  "24H": { interval: "1H", limit: 24, duration: 24 * 3600 },
  "7D": { interval: "4H", limit: 42, duration: 7 * 24 * 3600 },
  "30D": { interval: "1D", limit: 30, duration: 30 * 24 * 3600 },
  "90D": { interval: "1D", limit: 90, duration: 90 * 24 * 3600 },
  "1Y": { interval: "1W", limit: 52, duration: 365 * 24 * 3600 },
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
      const { interval, duration } = TIMEFRAME_CONFIG[timeframe];
      const now = Math.floor(Date.now() / 1000);
      const from = now - duration;
      const to = now;

      // Use the upgraded APIs which support ohlcvFrom/ohlcvTo
      let url = `/api/getToken?assetId=${assetId}&ohlcvInterval=${interval}&ohlcvFrom=${from}&ohlcvTo=${to}&include=ohlcv`;
      if (mint) {
        url = `/api/getVariant?assetId=${assetId}&mint=${mint}&ohlcvInterval=${interval}&ohlcvFrom=${from}&ohlcvTo=${to}&include=ohlcv`;
      }

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
