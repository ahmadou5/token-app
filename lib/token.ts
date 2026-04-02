import {
  AssetsCuratedResponse,
  AssetsResolveResponse,
  AssetsSearchResponse,
} from "@/types";
import axios, { AxiosError } from "axios";

/**
 * Create a specialized Axios instance
 */
const tokenClient = axios.create({
  baseURL: "https://api.tokens.xyz/api/v1",
  headers: {
    "x-api-key": process.env.TOKEN_API_KEY,
    Accept: "application/json",
  },
  // This helps prevent some extension interference by not sending cookies
  withCredentials: false,
});

/**
 * Global Error Handling Interceptor
 */
tokenClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // This catches CORS blocks, 401s, 500s, and Network errors
    console.error(`[TokenAPI Error] ${error.config?.url}:`, error.message);
    return Promise.reject(error);
  },
);

export const tokenRequest = {
  curatedAssetsList: async () => {
    const { data } = await tokenClient.get(
      "/assets/curated?list=all&groupBy=asset",
    );
    return data as AssetsCuratedResponse;
  },

  getAsset: async (assetId: string) => {
    const { data } = await tokenClient.get(
      `/assets/${assetId}?include=profile%2Crisk%2Cohlcv%2Cmarkets`,
    );
    return data as AssetsResolveResponse;
  },

  searchAsset: async (query: string) => {
    const { data } = await tokenClient.get(`/assets/search`, {
      params: { q: query }, // Axios handles encoding automatically
    });
    return data as AssetsSearchResponse;
  },
};
