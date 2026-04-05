import {
  AssetsCuratedResponse,
  AssetsResolveResponse,
  AssetsSearchResponse,
} from "@/types";
import axios from "axios";

export type OHLCVInterval = "1H" | "4H" | "1D" | "1W";
export type OHLCVTimeframe = "24H" | "7D" | "30D" | "90D" | "1Y";

// The "Clean" format used by your UI
export interface OHLCVCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// The "Raw" format coming from the API (Unix, O, H, L, C, V)
export type RawOHLCVTuple = [number, number, number, number, number, number];

export interface RawOHLCVResponse {
  candles?: RawOHLCVTuple[];
  data?: RawOHLCVTuple[];
  // Sometimes APIs return the array directly
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

  getAsset: async (assetId: string, include?: boolean) => {
    const { data } = await localClient.get("/", {
      params: {
        endpoint: `/assets/${assetId}${include ? "?include=profile%2Crisk%2Cohlcv%2Cmarkets" : ""}`,
      },
    });
    return data as AssetsResolveResponse;
  },

  getAssetMarket: async (mint: string) => {
    const { data } = await localClient.get("/", {
      params: {
        endpoint: `/assets/solana?include=markets&mint=${mint}&marketsOffset=0&marketsLimit=50`,
      },
    });
    return data;
  },

  getOHLCV: async (assetId: string, interval: string, limit: number) => {
    const { data } = await localClient.get("/", {
      params: {
        endpoint: `/assets/${assetId}/ohlcv?interval=${interval}&limit=${limit}`,
      },
    });
    return data as RawOHLCVResponse | RawOHLCVTuple[];
  },

  searchAsset: async (query: string) => {
    const { data } = await localClient.get("/", {
      params: { endpoint: `/assets/search?q=${encodeURIComponent(query)}` },
    });
    return data as AssetsSearchResponse;
  },
};
