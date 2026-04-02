"use client";

import { useRef, useEffect } from "react";
import { useTokens } from "@/hooks/useToken";
import { TokenCard } from "@/components/TokenCard";
import type { AnyToken } from "@/hooks/useToken";

function CategoryTabs({
  categories,
  active,
  onChange,
}: {
  categories: { key: string; label: string; count: number }[];
  active: string;
  onChange: (k: string) => void;
}) {
  return (
    <div className="tg-tabs" role="tablist">
      {categories.map((cat) => (
        <button
          key={cat.key}
          role="tab"
          aria-selected={active === cat.key}
          className={`tg-tab ${active === cat.key ? "tg-tab--active" : ""}`}
          onClick={() => onChange(cat.key)}
        >
          {cat.label}
          <span className="tg-tab__count">{cat.count}</span>
        </button>
      ))}
    </div>
  );
}

function SearchBar({
  value,
  onChange,
  isSearching,
}: {
  value: string;
  onChange: (v: string) => void;
  isSearching: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="tg-search">
      <svg className="tg-search__icon" viewBox="0 0 16 16" fill="none">
        <circle
          cx="6.5"
          cy="6.5"
          r="4.5"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M10.5 10.5L14 14"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      <input
        ref={ref}
        className="tg-search__input"
        type="text"
        placeholder="Search tokens on Solana…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Search tokens"
      />
      {isSearching && (
        <span className="tg-search__spinner" aria-label="Searching" />
      )}
      {value && !isSearching && (
        <button
          className="tg-search__clear"
          onClick={() => onChange("")}
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
      <span className="tg-search__kbd">⌘K</span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="tg-skeleton">
      <div className="tg-skeleton__row">
        <div className="tg-skeleton__circle" />
        <div className="tg-skeleton__lines">
          <div className="tg-skeleton__line tg-skeleton__line--name" />
          <div className="tg-skeleton__line tg-skeleton__line--sym" />
        </div>
      </div>
      <div className="tg-skeleton__price" />
      <div className="tg-skeleton__grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="tg-skeleton__stat" />
        ))}
      </div>
    </div>
  );
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="tg-empty">
      <svg viewBox="0 0 48 48" fill="none" className="tg-empty__icon">
        <circle
          cx="21"
          cy="21"
          r="13"
          stroke="currentColor"
          strokeWidth="2.5"
        />
        <path
          d="M30 30L42 42"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M16 21h10M21 16v10"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <p className="tg-empty__text">
        {query
          ? `No tokens found for "${query}"`
          : "No tokens in this category"}
      </p>
    </div>
  );
}

export interface TokenGridProps {
  onTokenClick?: (token: AnyToken) => void;
}

export function TokenGrid({ onTokenClick }: TokenGridProps) {
  const {
    filtered,
    categories,
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    isLoading,
    isSearching,
    error,
    refetch,
  } = useTokens();

  return (
    <div className="tg">
      <header className="tg-header">
        <h1 className="tg-header__title">Tokens on Solana</h1>
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          isSearching={isSearching}
        />
      </header>

      {!isLoading && !error && (
        <CategoryTabs
          categories={categories}
          active={activeCategory}
          onChange={setActiveCategory}
        />
      )}

      {error && (
        <div className="tg-error">
          <p>Failed to load tokens.</p>
          <button className="tg-error__retry" onClick={refetch}>
            Retry
          </button>
        </div>
      )}

      <div className="tg-grid">
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
        ) : filtered.length === 0 ? (
          <div className="tg-grid__empty">
            <EmptyState query={searchQuery} />
          </div>
        ) : (
          filtered.map((token, i) => (
            <TokenCard
              key={token.assetId ?? i}
              token={token}
              onClick={onTokenClick}
              index={i}
            />
          ))
        )}
      </div>
    </div>
  );
}
