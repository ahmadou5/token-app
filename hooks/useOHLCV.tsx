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
export function useOHLCV(assetId: string | null): UseOHLCVReturn {
  const [candles, setCandles] = useState<OHLCVCandle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [timeframe, setTimeframeState] = useState<OHLCVTimeframe>("7D");

  const fetchCandles = useCallback(async () => {
    if (!assetId) return;
    setIsLoading(true);
    setError(null);
    try {
      const { interval, limit } = TIMEFRAME_CONFIG[timeframe];
      const data = await tokenRequest.getOHLCV(assetId, interval, limit);

      let rawArray: RawOHLCVTuple[] = [];
      if (Array.isArray(data)) {
        rawArray = data as RawOHLCVTuple[];
      } else if (data && typeof data === "object") {
        rawArray = data.candles || data.data || [];
      }

      const parsed: OHLCVCandle[] = rawArray.map((c) => {
        if (Array.isArray(c)) {
          return {
            time: c[0] * 1000,
            open: c[1],
            high: c[2],
            low: c[3],
            close: c[4],
            volume: c[5],
          };
        }
        // Object format — still needs seconds → ms conversion
        const obj = c as unknown as OHLCVCandle;
        return {
          ...obj,
          time: obj.time * 1000,
        };
      });

      setCandles(parsed);
    } catch (err) {
      console.error("OHLCV Fetch Error:", err);
      setError(err instanceof Error ? err : new Error("Failed to fetch OHLCV"));
      setCandles([]);
    } finally {
      setIsLoading(false);
    }
  }, [assetId, timeframe]);

  useEffect(() => {
    fetchCandles();
  }, [fetchCandles]);

  return {
    candles,
    isLoading,
    error,
    interval: TIMEFRAME_CONFIG[timeframe].interval, // derived, not state
    timeframe,
    setInterval: () => {}, // no-op, kept for interface compatibility
    setTimeframe: setTimeframeState,
  };
}
