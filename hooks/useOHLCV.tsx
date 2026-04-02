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

// Map timeframe → how many candles back to show
const TIMEFRAME_LIMIT: Record<OHLCVTimeframe, number> = {
  "24H": 24,
  "7D": 168,
  "30D": 30,
  "90D": 90,
  "1Y": 365,
};

export function useOHLCV(assetId: string | null): UseOHLCVReturn {
  const [candles, setCandles] = useState<OHLCVCandle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [interval, setIntervalState] = useState<OHLCVInterval>("1H");
  const [timeframe, setTimeframeState] = useState<OHLCVTimeframe>("7D");

  const fetchCandles = useCallback(async () => {
    if (!assetId) return;
    setIsLoading(true);
    setError(null);
    try {
      const limit = TIMEFRAME_LIMIT[timeframe];
      const data = await tokenRequest.getOHLCV(assetId, interval, limit);

      let rawArray: RawOHLCVTuple[] = [];

      // 1. Extract the raw array regardless of wrapper object
      if (Array.isArray(data)) {
        rawArray = data as RawOHLCVTuple[];
      } else if (data && typeof data === "object") {
        rawArray = data.candles || data.data || [];
      }

      // 2. Map Raw Tuples to Clean Objects
      // We check if index 0 is a number to ensure we aren't mapping
      // an already-parsed object array (safety check)
      const parsed: OHLCVCandle[] = rawArray.map((c) => {
        if (Array.isArray(c)) {
          return {
            time: c[0],
            open: c[1],
            high: c[2],
            low: c[3],
            close: c[4],
            volume: c[5],
          };
        }
        return c as unknown as OHLCVCandle;
      });

      setCandles(parsed);
    } catch (err) {
      console.error("OHLCV Fetch Error:", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch OHLCV"));
      setCandles([]);
    } finally {
      setIsLoading(false);
    }
  }, [assetId, interval, timeframe]);

  useEffect(() => {
    fetchCandles();
  }, [fetchCandles]);

  return {
    candles,
    isLoading,
    error,
    interval,
    timeframe,
    setInterval: setIntervalState,
    setTimeframe: setTimeframeState,
  };
}
