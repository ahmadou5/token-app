"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTokens } from "@/hooks/useToken";
import { fmtPrice } from "@/components/TokenCard";
import type { AnyToken } from "@/hooks/useToken";

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtVol(n: number | null | undefined): string {
  if (n == null) return "";
  if (n >= 1e9) return `Vol: $${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `Vol: $${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `Vol: $${(n / 1e3).toFixed(2)}K`;
  return `Vol: $${n.toFixed(2)}`;
}

// ─── Result row ───────────────────────────────────────────────────────────────

function ResultRow({
  token,
  active,
  onSelect,
}: {
  token: AnyToken;
  active: boolean;
  onSelect: () => void;
}) {
  const name = token.name ?? token.primaryVariant?.name ?? "Unknown";
  const symbol = token.symbol ?? token.primaryVariant?.symbol ?? "";
  const price =
    token.stats?.price ?? token.primaryVariant?.market?.price ?? null;
  const vol =
    token.stats?.volume24hUSD ??
    token.primaryVariant?.market?.volume24hUSD ??
    null;
  const change =
    token.stats?.priceChange24hPercent ??
    token.primaryVariant?.market?.priceChange24hPercent ??
    null;
  const imageUrl = "imageUrl" in token ? token.imageUrl : null;
  const logoURI = token.primaryVariant?.market?.logoURI ?? null;
  const src = imageUrl ?? logoURI;
  const initials = name?.slice(0, 2).toUpperCase();

  return (
    <div
      className={`srch-row ${active ? "srch-row--active" : ""}`}
      onClick={onSelect}
      onMouseEnter={(e) => (e.currentTarget as HTMLElement).focus()}
      role="option"
      aria-selected={active}
    >
      {/* Avatar */}
      <div className="srch-avatar">
        {src ? (
          <img
            src={src}
            alt={name}
            onError={(e) => {
              e.currentTarget.style.display = "none";
              if (e.currentTarget.parentElement)
                e.currentTarget.parentElement.textContent = initials;
            }}
          />
        ) : (
          initials
        )}
      </div>

      {/* Identity */}
      <div className="srch-identity">
        <span className="srch-name">{name}</span>
        <span className="srch-sym">{symbol}</span>
        {vol != null && <span className="srch-vol">{fmtVol(vol)}</span>}
      </div>

      {/* Price + change */}
      <div className="srch-price-col">
        {price != null && <span className="srch-price">{fmtPrice(price)}</span>}
        {change != null && (
          <span
            className={`srch-change ${change >= 0 ? "srch-change--up" : "srch-change--dn"}`}
          >
            {change >= 0 ? "+" : ""}
            {change.toFixed(2)}%
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const { tokens, filtered, searchQuery, setSearchQuery, isSearching } =
    useTokens();

  // Top by volume (no query) — sort curated list by volume
  const topByVolume = [...tokens]
    .sort((a, b) => (b.stats?.volume24hUSD ?? 0) - (a.stats?.volume24hUSD ?? 0))
    .slice(0, 8);

  const results: AnyToken[] = searchQuery.trim()
    ? filtered?.slice(0, 12)
    : topByVolume;

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearchQuery("");
    }
  }, [open, setSearchQuery]);

  // Global ⌘K / Ctrl+K to open — handled by parent, but also close on backdrop click
  function handleSelect(token: AnyToken) {
    router.push(`/token/${token.assetId}`);
    onClose();
  }

  // Keyboard nav
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, results.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && results[activeIdx]) {
        handleSelect(results[activeIdx]);
      }
    },
    [open, results, activeIdx, handleSelect, onClose],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="srch-backdrop" onClick={onClose} aria-hidden />

      {/* Modal */}
      <div
        className="srch-modal"
        role="dialog"
        aria-modal
        aria-label="Search tokens"
      >
        {/* Input */}
        <div className="srch-input-wrap">
          <svg className="srch-input-icon" viewBox="0 0 16 16" fill="none">
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
            ref={inputRef}
            className="srch-input"
            type="text"
            placeholder="Search tokens..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setActiveIdx(0);
            }}
            autoComplete="off"
            spellCheck={false}
          />
          {isSearching && <span className="srch-spinner" />}
          {searchQuery && !isSearching && (
            <button className="srch-clear" onClick={() => setSearchQuery("")}>
              ✕
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="srch-divider" />

        {/* Section label */}
        <div className="srch-section-label">
          {searchQuery.trim() ? (
            <>Results for &ldquo;{searchQuery}&rdquo;</>
          ) : (
            <>
              <svg viewBox="0 0 14 14" fill="none" width="12" height="12">
                <path
                  d="M2 4h10M2 7h7M2 10h5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
              Top by volume
            </>
          )}
        </div>

        {/* Results */}
        <div
          className="srch-list"
          ref={listRef}
          role="listbox"
          aria-label="Token search results"
        >
          {results.length === 0 ? (
            <div className="srch-empty">No tokens found</div>
          ) : (
            results.map((token, i) => (
              <ResultRow
                key={token.assetId ?? i}
                token={token}
                active={i === activeIdx}
                onSelect={() => handleSelect(token)}
              />
            ))
          )}
        </div>

        {/* Footer hints */}
        <div className="srch-footer">
          <span className="srch-hint">
            <kbd>↑↓</kbd> Navigate
          </span>
          <span className="srch-hint">
            <kbd>↵</kbd> Select
          </span>
          <span className="srch-hint">
            <kbd>Esc</kbd> Close
          </span>
        </div>
      </div>
    </>
  );
}

// ─── Trigger button (goes in topbar) ─────────────────────────────────────────

interface SearchTriggerProps {
  onClick: () => void;
  placeholder?: string;
}

export function SearchTrigger({
  onClick,
  placeholder = "Find tokens...",
}: SearchTriggerProps) {
  // Also listen for ⌘K
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onClick();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClick]);

  return (
    <button
      className="srch-trigger"
      onClick={onClick}
      aria-label="Search tokens"
    >
      <svg className="srch-trigger__icon" viewBox="0 0 16 16" fill="none">
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
      <span className="srch-trigger__text">{placeholder}</span>
      <span className="srch-trigger__kbd">⌘K</span>
    </button>
  );
}
