import {
  AssetsCuratedResponse,
  AssetsResolveResponse,
  AssetsSearchResponse,
} from "@/types";
import axios from "axios";

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
/**
 * Create a specialized Axios instance
 */
const localClient = axios.create({
  baseURL: "/api/token",
});

export const tokenRequest = {
  curatedAssetsList: async () => {
    // This sends 'endpoint' as a query param to your route handler
    const { data } = await localClient.get("/", {
      params: { endpoint: "/assets/curated?list=all&groupBy=asset" },
    });

    return data as AssetsCuratedResponse;
  },

  getAsset: async (assetId: string) => {
    const { data } = await localClient.get("/", {
      params: {
        endpoint: `/assets/${assetId}?include=profile%2Crisk%2Cohlcv%2Cmarkets`,
      },
    });
    return data as AssetsResolveResponse;
  },

  getOHLCV: async (assetId: string, interval: string, limit: number) => {
    const { data } = await localClient.get("/", {
      params: {
        endpoint: `/assets/${assetId}/ohlcv?interval=${interval}&limit=${limit}`,
      },
    });
    return data as UseOHLCVReturn["candles"];
  },

  searchAsset: async (query: string) => {
    const { data } = await localClient.get("/", {
      params: { endpoint: `/assets/search?q=${encodeURIComponent(query)}` },
    });
    return data as AssetsSearchResponse;
  },
};
