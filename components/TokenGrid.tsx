"use client";

import { useRef, useEffect, useState } from "react";
import { useTokens } from "@/hooks/useToken";
import { TokenCard, ListHeader } from "@/components/TokenCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { AnyToken } from "@/hooks/useToken";
import type { ViewMode } from "@/components/TokenCard";

function GridIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" width="15" height="15">
      <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" width="15" height="15">
      <rect x="1" y="2" width="14" height="2.5" rx="1.25" fill="currentColor" />
      <rect
        x="1"
        y="6.75"
        width="14"
        height="2.5"
        rx="1.25"
        fill="currentColor"
      />
      <rect
        x="1"
        y="11.5"
        width="14"
        height="2.5"
        rx="1.25"
        fill="currentColor"
      />
    </svg>
  );
}

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
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
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
        placeholder="Search tokens…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Search tokens"
      />
      {isSearching && <span className="tg-search__spinner" />}
      {value && !isSearching && (
        <button className="tg-search__clear" onClick={() => onChange("")}>
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

function SkeletonRow() {
  return (
    <div className="tg-skeleton-row">
      <div className="tg-skeleton-row__bar" />
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
        {query ? `No results for "${query}"` : "No tokens in this category"}
      </p>
    </div>
  );
}

export interface TokenGridProps {
  onTokenClick?: (token: AnyToken) => void;
}

export function TokenGrid({ onTokenClick }: TokenGridProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
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
      {/* Top nav */}
      <div className="tg-topbar">
        <div className="tg-topbar__left">
          <svg className="tg-topbar__logo" viewBox="0 0 20 20" fill="none">
            <circle
              cx="10"
              cy="10"
              r="8"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M6 10h8M10 6v8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <span className="tg-topbar__brand">Tokens</span>
        </div>
        <div className="tg-topbar__center">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            isSearching={isSearching}
          />
        </div>
        <div className="tg-topbar__right">
          <ThemeToggle />
        </div>
      </div>

      {/* Hero */}
      <div className="tg-hero">
        <h1 className="tg-hero__title">Tokens on Solana</h1>
        <p className="tg-hero__sub">
          Real-time prices, liquidity &amp; market data
        </p>
      </div>

      {/* Controls */}
      {!isLoading && !error && (
        <div className="tg-controls">
          <div className="tg-controls__tabs">
            <CategoryTabs
              categories={categories}
              active={activeCategory}
              onChange={setActiveCategory}
            />
          </div>
          <div className="tg-controls__view">
            <button
              className={`tg-view-btn ${viewMode === "grid" ? "tg-view-btn--active" : ""}`}
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
            >
              <GridIcon />
            </button>
            <button
              className={`tg-view-btn ${viewMode === "list" ? "tg-view-btn--active" : ""}`}
              onClick={() => setViewMode("list")}
              aria-label="List view"
            >
              <ListIcon />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="tg-error">
          <p>Failed to load tokens.</p>
          <button className="tg-error__retry" onClick={refetch}>
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && viewMode === "list" && filtered.length > 0 && (
        <ListHeader />
      )}

      {isLoading ? (
        <div className={viewMode === "grid" ? "tg-grid" : "tg-list"}>
          {Array.from({ length: 8 }).map((_, i) =>
            viewMode === "grid" ? (
              <SkeletonCard key={i} />
            ) : (
              <SkeletonRow key={i} />
            ),
          )}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState query={searchQuery} />
      ) : viewMode === "grid" ? (
        <div className="tg-grid">
          {filtered.map((token, i) => (
            <TokenCard
              key={token.assetId ?? i}
              token={token}
              onClick={onTokenClick}
              index={i}
              viewMode="grid"
            />
          ))}
        </div>
      ) : (
        <div className="tg-list">
          {filtered.map((token, i) => (
            <TokenCard
              key={token.assetId ?? i}
              token={token}
              onClick={onTokenClick}
              index={i}
              viewMode="list"
            />
          ))}
        </div>
      )}
    </div>
  );
}
