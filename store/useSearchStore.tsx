import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AnyToken } from "@/hooks/useToken";

// ─── Recent search entry ──────────────────────────────────────────────────────

export interface RecentSearch {
  assetId: string;
  name: string;
  symbol: string;
  imageUrl: string | null;
  price: number | null;
  change24h: number | null;
  volume: number | null;
  searchedAt: number; // unix ms
}

function tokenToRecent(token: AnyToken): RecentSearch {
  const name = token.name ?? token.primaryVariant?.name ?? "Unknown";
  const symbol = token.symbol ?? token.primaryVariant?.symbol ?? "";
  const imageUrl =
    ("imageUrl" in token ? token.imageUrl : null) ??
    token.primaryVariant?.market?.logoURI ??
    null;
  const price =
    token.stats?.price ?? token.primaryVariant?.market?.price ?? null;
  const change24h =
    token.stats?.priceChange24hPercent ??
    token.primaryVariant?.market?.priceChange24hPercent ??
    null;
  const volume =
    token.stats?.volume24hUSD ??
    token.primaryVariant?.market?.volume24hUSD ??
    null;

  return {
    assetId: token.assetId,
    name,
    symbol,
    imageUrl,
    price,
    change24h,
    volume,
    searchedAt: Date.now(),
  };
}

// ─── Store shape ──────────────────────────────────────────────────────────────

interface SearchStore {
  // Modal open state
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  toggleSearch: () => void;

  // Recent searches — persisted to localStorage
  recentSearches: RecentSearch[];
  addRecentSearch: (token: AnyToken) => void;
  removeRecentSearch: (assetId: string) => void;
  clearRecentSearches: () => void;
}

const MAX_RECENT = 5;

export const useSearchStore = create<SearchStore>()(
  persist(
    (set, get) => ({
      // ── Modal ──────────────────────────────────────────────────────────────
      searchOpen: false,
      setSearchOpen: (open) => set({ searchOpen: open }),
      toggleSearch: () => set((s) => ({ searchOpen: !s.searchOpen })),

      // ── Recent searches ────────────────────────────────────────────────────
      recentSearches: [],

      addRecentSearch: (token: AnyToken) => {
        const entry = tokenToRecent(token);
        const existing = get().recentSearches.filter(
          (r) => r.assetId !== token.assetId,
        );
        // Most recent first, cap at MAX_RECENT
        set({ recentSearches: [entry, ...existing].slice(0, MAX_RECENT) });
      },

      removeRecentSearch: (assetId: string) => {
        set((s) => ({
          recentSearches: s.recentSearches.filter((r) => r.assetId !== assetId),
        }));
      },

      clearRecentSearches: () => set({ recentSearches: [] }),
    }),
    {
      name: "token-search-store", // localStorage key
      // Only persist recent searches, not the open state
      partialize: (state) => ({ recentSearches: state.recentSearches }),
    },
  ),
);
