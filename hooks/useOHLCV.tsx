import { useCallback, useEffect, useState } from "react";
import { tokenRequest } from "@/lib/token";

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
      // The tokens.xyz OHLCV endpoint
      const data = await tokenRequest.getOHLCV(assetId, interval, limit);

      // Handle both array format and { candles: [] } format
      let parsed: OHLCVCandle[];

      if (Array.isArray(data)) {
        // Check if it's already OHLCVCandle[] or tuple array
        if (
          data.length > 0 &&
          typeof data[0] === "object" &&
          "time" in data[0]
        ) {
          parsed = data as OHLCVCandle[];
        } else {
          const raw = data as unknown as Array<
            [number, number, number, number, number, number]
          >;
          parsed = raw.map((c) => ({
            time: c[0],
            open: c[1],
            high: c[2],
            low: c[3],
            close: c[4],
            volume: c[5],
          }));
        }
      } else if (typeof data === "object" && data !== null) {
        const raw =
          "candles" in data
            ? (
                data as {
                  candles: Array<
                    [number, number, number, number, number, number]
                  >;
                }
              ).candles
            : "data" in data
              ? (
                  data as {
                    data: Array<
                      [number, number, number, number, number, number]
                    >;
                  }
                ).data
              : [];
        parsed = raw.map((c) => ({
          time: c[0],
          open: c[1],
          high: c[2],
          low: c[3],
          close: c[4],
          volume: c[5],
        }));
      } else {
        parsed = [];
      }

      setCandles(parsed);
    } catch (err) {
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
