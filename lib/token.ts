import {
  AssetsCuratedResponse,
  AssetsResolveResponse,
  AssetsSearchResponse,
} from "@/types";
import axios from "axios";

/**
 * Create a specialized Axios instance
 */
const localClient = axios.create({
  baseURL: "/api/tokens",
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

  searchAsset: async (query: string) => {
    const { data } = await localClient.get("/", {
      params: { endpoint: `/assets/search?q=${encodeURIComponent(query)}` },
    });
    return data as AssetsSearchResponse;
  },
};
