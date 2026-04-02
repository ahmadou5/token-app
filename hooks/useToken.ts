import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { tokenRequest } from "@/lib/token"; // adjust path to your file
import type { AssetsCuratedResponse, AssetsSearchResponse } from "@/types";

// ─── Derived types ────────────────────────────────────────────────────────────

export type TokenAsset = AssetsCuratedResponse["assets"][number];
export type SearchResult = AssetsSearchResponse["results"][number];

/** Union of both shapes so components can render either */
export type AnyToken = TokenAsset | SearchResult;

export type TokenCategory =
  | "all"
  | "crypto"
  | "currencies"
  | "treasuries"
  | "etfs"
  | "metals"
  | "stocks"
  | string; // keep open for future categories

export interface CategoryMeta {
  key: TokenCategory;
  label: string;
  count: number;
}

export interface UseTokensReturn {
  /** Full curated list, all categories */
  tokens: TokenAsset[];
  /** Tokens filtered by activeCategory + searchQuery (local pass) */
  filtered: AnyToken[];
  /** Results from remote search (populated only when local lookup is empty) */
  searchResults: SearchResult[];
  /** All distinct categories derived from the curated list */
  categories: CategoryMeta[];
  activeCategory: TokenCategory;
  setActiveCategory: (cat: TokenCategory) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  /** True while the initial curated list is loading */
  isLoading: boolean;
  /** True while a remote search request is in-flight */
  isSearching: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalise = (s: string) => s.toLowerCase().trim();

function matchesQuery(token: TokenAsset, query: string): boolean {
  const q = normalise(query);
  return (
    normalise(token.name ?? "").includes(q) ||
    normalise(token.symbol ?? "").includes(q) ||
    normalise(token.assetId).includes(q)
  );
}

function categoryLabel(raw: string): string {
  const map: Record<string, string> = {
    crypto: "Crypto",
    currencies: "Currencies",
    treasuries: "Treasuries",
    etfs: "ETFs",
    metals: "Metals",
    stocks: "Stocks",
  };
  return map[raw.toLowerCase()] ?? raw.charAt(0).toUpperCase() + raw.slice(1);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTokens(): UseTokensReturn {
  const [tokens, setTokens] = useState<TokenAsset[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [activeCategory, setActiveCategory] = useState<TokenCategory>("all");
  const [searchQuery, setSearchQueryState] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Keep a ref to the latest search query so stale closures don't clobber state
  const latestQuery = useRef("");
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch curated list ──────────────────────────────────────────────────────
  const fetchTokens = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await tokenRequest.curatedAssetsList();
      setTokens(res.assets ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch tokens"),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  // ── Categories (derived) ────────────────────────────────────────────────────
  const categories = useMemo<CategoryMeta[]>(() => {
    const counts = new Map<string, number>();
    for (const t of tokens) {
      const cat = t.category?.toLowerCase() ?? "other";
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    const list: CategoryMeta[] = [
      { key: "all", label: "All", count: tokens.length },
    ];
    for (const [key, count] of counts.entries()) {
      list.push({ key, label: categoryLabel(key), count });
    }
    return list;
  }, [tokens]);

  // ── Local filter ────────────────────────────────────────────────────────────
  const localFiltered = useMemo<TokenAsset[]>(() => {
    let list = tokens;
    if (activeCategory !== "all") {
      list = list.filter(
        (t) => t.category?.toLowerCase() === activeCategory.toLowerCase(),
      );
    }
    if (searchQuery.trim()) {
      list = list.filter((t) => matchesQuery(t, searchQuery));
    }
    return list;
  }, [tokens, activeCategory, searchQuery]);

  // ── Remote search (debounced, only when local yields nothing) ───────────────
  const triggerRemoteSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }
      // Only go remote if local filter returned nothing
      if (localFiltered.length > 0) {
        setSearchResults([]);
        return;
      }
      latestQuery.current = query;
      setIsSearching(true);
      try {
        const res = await tokenRequest.searchAsset(query);
        // Guard against a stale response arriving after the query changed
        if (latestQuery.current === query) {
          setSearchResults(res.results ?? []);
        }
      } catch {
        // Silently ignore search errors; the UI can still show local results
      } finally {
        if (latestQuery.current === query) {
          setIsSearching(false);
        }
      }
    },
    [localFiltered.length],
  );

  // ── setSearchQuery: update state + debounce remote search ──────────────────
  const setSearchQuery = useCallback(
    (q: string) => {
      setSearchQueryState(q);
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
      if (!q.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }
      searchDebounce.current = setTimeout(() => {
        triggerRemoteSearch(q);
      }, 350);
    },
    [triggerRemoteSearch],
  );

  // When localFiltered changes (tokens loaded), re-evaluate whether remote
  // search is still needed for the current query
  useEffect(() => {
    if (searchQuery.trim() && localFiltered.length > 0) {
      setSearchResults([]);
    }
  }, [localFiltered, searchQuery]);

  // ── Unified filtered list ───────────────────────────────────────────────────
  const filtered = useMemo<AnyToken[]>(() => {
    if (
      searchQuery.trim() &&
      localFiltered.length === 0 &&
      searchResults.length > 0
    ) {
      return searchResults;
    }
    return localFiltered;
  }, [localFiltered, searchResults, searchQuery]);

  return {
    tokens,
    filtered,
    searchResults,
    categories,
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    isLoading,
    isSearching,
    error,
    refetch: fetchTokens,
  };
}
