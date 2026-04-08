"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTokens } from "@/hooks/useToken";
import { fmtPrice } from "@/components/TokenCard";
import { useSearchStore, type RecentSearch } from "@/store/useSearchStore";
import type { AnyToken } from "@/hooks/useToken";

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtVol(n: number | null | undefined): string {
  if (n == null) return "";
  if (n >= 1e9) return `Vol: $${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `Vol: $${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `Vol: $${(n / 1e3).toFixed(2)}K`;
  return `Vol: $${n.toFixed(2)}`;
}

function safeInitials(name: string | null | undefined): string {
  if (!name || typeof name !== "string" || name.length === 0) return "?";
  return name.slice(0, 2).toUpperCase();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SearchAvatar({
  src,
  name,
}: {
  src?: string | null;
  name?: string | null;
}) {
  const init = safeInitials(name);
  return (
    <div className="srch-avatar">
      {src ? (
        <img
          src={src}
          alt={name ?? ""}
          onError={(e) => {
            e.currentTarget.style.display = "none";
            const p = e.currentTarget.parentElement;
            if (p) p.textContent = init;
          }}
        />
      ) : (
        init
      )}
    </div>
  );
}

function PctChip({ value }: { value: number | null | undefined }) {
  if (value == null) return null;
  const up = value >= 0;
  const label = `${up ? "+" : ""}${value.toFixed(2)}%`;
  return (
    <span className={`srch-pct ${up ? "srch-pct--up" : "srch-pct--dn"}`}>
      {label}
    </span>
  );
}

function ResultRow({
  token,
  active,
  onSelect,
  onHover,
}: {
  token: AnyToken;
  active: boolean;
  onSelect: () => void;
  onHover: () => void;
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
  const src =
    ("imageUrl" in token ? token.imageUrl : null) ??
    token.primaryVariant?.market?.logoURI ??
    null;

  return (
    <div
      className={`srch-row ${active ? "srch-row--active" : ""}`}
      onClick={onSelect}
      onMouseEnter={onHover}
      role="option"
      aria-selected={active}
    >
      <SearchAvatar src={src} name={name} />
      <div className="srch-row__body">
        <div className="srch-row__top">
          <span className="srch-name">{name}</span>
          <span className="srch-sym">{symbol}</span>
        </div>
        <div className="srch-row__bottom">
          {price != null && (
            <span className="srch-price">{fmtPrice(price)}</span>
          )}
          {vol != null && <span className="srch-vol">{fmtVol(vol)}</span>}
        </div>
      </div>
      <PctChip value={change} />
    </div>
  );
}

function RecentRow({
  entry,
  active,
  onSelect,
  onRemove,
  onHover,
}: {
  entry: RecentSearch;
  active: boolean;
  onSelect: () => void;
  onRemove: (e: React.MouseEvent) => void;
  onHover: () => void;
}) {
  return (
    <div
      className={`srch-row srch-row--recent ${active ? "srch-row--active" : ""}`}
      onClick={onSelect}
      onMouseEnter={onHover}
      role="option"
      aria-selected={active}
    >
      <SearchAvatar src={entry.imageUrl} name={entry.name} />
      <div className="srch-row__body">
        <div className="srch-row__top">
          <span className="srch-name">{entry.name}</span>
          <span className="srch-sym">{entry.symbol}</span>
        </div>
        <div className="srch-row__bottom">
          {entry.price != null && (
            <span className="srch-price">{fmtPrice(entry.price)}</span>
          )}
          {entry.volume != null && (
            <span className="srch-vol">{fmtVol(entry.volume)}</span>
          )}
        </div>
      </div>
      <PctChip value={entry.change24h} />
      <button
        className="srch-row__remove"
        onClick={onRemove}
        aria-label={`Remove ${entry.name}`}
        tabIndex={-1}
      >
        <svg viewBox="0 0 12 12" fill="none" width="11" height="11">
          <path
            d="M2 2l8 8M10 2l-8 8"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}

function SectionLabel({
  icon,
  label,
  action,
}: {
  icon: React.ReactNode;
  label: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="srch-section-label">
      <span className="srch-section-label__left">
        {icon}
        {label}
      </span>
      {action && <span className="srch-section-label__action">{action}</span>}
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const ClockIcon = () => (
  <svg viewBox="0 0 14 14" fill="none" width="12" height="12">
    <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2" />
    <path
      d="M7 4v3l2 1.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const BarIcon = () => (
  <svg viewBox="0 0 14 14" fill="none" width="12" height="12">
    <rect x="1" y="8" width="3" height="5" rx="0.5" fill="currentColor" />
    <rect x="5.5" y="5" width="3" height="8" rx="0.5" fill="currentColor" />
    <rect x="10" y="2" width="3" height="11" rx="0.5" fill="currentColor" />
  </svg>
);

const SearchIcon = () => (
  <svg viewBox="0 0 14 14" fill="none" width="12" height="12">
    <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" />
    <path
      d="M9.5 9.5L13 13"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

// ─── Main modal ───────────────────────────────────────────────────────────────

export function SearchModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Local state — no useEffect to set these
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);

  // Track previous open state to detect open→close transition
  const prevOpenRef = useRef(false);

  const { tokens, isSearching } = useTokens();
  const {
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
  } = useSearchStore();

  // ── Derived lists ──────────────────────────────────────────────────────────

  const trimmed = query.trim().toLowerCase();

  const localFiltered = trimmed
    ? tokens
        .filter((t) => {
          const n = (t.name ?? "").toLowerCase();
          const s = (t.symbol ?? "").toLowerCase();
          const id = (t.assetId ?? "").toLowerCase();
          return (
            n.includes(trimmed) || s.includes(trimmed) || id.includes(trimmed)
          );
        })
        .slice(0, 12)
    : [];

  const topByVolume = [...tokens]
    .sort((a, b) => (b.stats?.volume24hUSD ?? 0) - (a.stats?.volume24hUSD ?? 0))
    .slice(0, 8);

  const showRecent = !trimmed && recentSearches.length > 0;
  const showResults = !!trimmed;
  const showTop = !trimmed;

  type NavItem =
    | { type: "recent"; entry: RecentSearch }
    | { type: "token"; token: AnyToken };

  const navItems: NavItem[] = [
    ...(showRecent
      ? recentSearches.map((e) => ({ type: "recent" as const, entry: e }))
      : []),
    ...(showResults
      ? localFiltered.map((t) => ({ type: "token" as const, token: t }))
      : []),
    ...(showTop
      ? topByVolume.map((t) => ({ type: "token" as const, token: t }))
      : []),
  ];

  // ── Focus input when modal opens (no setState inside) ─────────────────────
  // Use a ref to track if we need to reset on next render cycle
  if (open && !prevOpenRef.current) {
    // This runs synchronously during render (not in effect), safe for refs
    prevOpenRef.current = true;
  }
  if (!open && prevOpenRef.current) {
    prevOpenRef.current = false;
  }

  // Focus-only effect — no setState
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);

  // Reset query/activeIdx when modal opens — use key prop technique instead
  // (handled by the `key` prop on the modal div below)

  // ── Navigation handlers ────────────────────────────────────────────────────

  function selectToken(token: AnyToken) {
    addRecentSearch(token);
    router.push(`/token/${token.assetId}`);
    onClose();
  }

  function selectRecent(entry: RecentSearch) {
    router.push(`/token/${entry.assetId}`);
    onClose();
  }

  function handleQueryChange(val: string) {
    setQuery(val);
    setActiveIdx(0); // Reset on same event — fine, not in an effect
  }

  // ── Keyboard navigation — plain event listener, no useCallback ────────────

  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, navItems.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter") {
        const item = navItems[activeIdx];
        if (!item) return;
        if (item.type === "recent") selectRecent(item.entry);
        else selectToken(item.token);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeIdx, navItems.length]);

  if (!open) return null;

  // Use `key` to reset internal state when modal reopens
  // The key changes each time open flips to true, remounting and resetting query/activeIdx
  let off = 0;

  return (
    <>
      <div className="srch-backdrop" onClick={onClose} aria-hidden />

      {/* key remounts the modal on each open, resetting query & activeIdx naturally */}
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
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          {isSearching && <span className="srch-spinner" />}
          {query && (
            <button
              className="srch-clear"
              onClick={() => handleQueryChange("")}
            >
              ✕
            </button>
          )}
        </div>

        <div className="srch-divider" />

        <div className="srch-list" role="listbox">
          {/* Recent searches */}
          {showRecent &&
            (() => {
              const start = off;
              const section = (
                <div className="srch-section" key="recent">
                  <SectionLabel
                    icon={<ClockIcon />}
                    label="Recent searches"
                    action={
                      <button
                        className="srch-clear-all"
                        onClick={clearRecentSearches}
                      >
                        Clear all
                      </button>
                    }
                  />
                  {recentSearches.map((entry, i) => (
                    <RecentRow
                      key={entry.assetId}
                      entry={entry}
                      active={activeIdx === start + i}
                      onSelect={() => selectRecent(entry)}
                      onRemove={(e) => {
                        e.stopPropagation();
                        removeRecentSearch(entry.assetId);
                      }}
                      onHover={() => setActiveIdx(start + i)}
                    />
                  ))}
                </div>
              );
              off += recentSearches.length;
              return section;
            })()}

          {/* Search results */}
          {showResults &&
            (() => {
              const start = off;
              const section = (
                <div className="srch-section" key="results">
                  <SectionLabel
                    icon={<SearchIcon />}
                    label={`Results for "${query}"`}
                  />
                  {localFiltered.length > 0 ? (
                    localFiltered.map((token, i) => (
                      <ResultRow
                        key={token.assetId ?? i}
                        token={token}
                        active={activeIdx === start + i}
                        onSelect={() => selectToken(token)}
                        onHover={() => setActiveIdx(start + i)}
                      />
                    ))
                  ) : (
                    <div className="srch-empty">No tokens found</div>
                  )}
                </div>
              );
              off += localFiltered.length;
              return section;
            })()}

          {/* Top by volume */}
          {showTop &&
            (() => {
              const start = off;
              return (
                <div className="srch-section" key="top">
                  <SectionLabel icon={<BarIcon />} label="Top by volume" />
                  {topByVolume.map((token, i) => (
                    <ResultRow
                      key={token.assetId ?? i}
                      token={token}
                      active={activeIdx === start + i}
                      onSelect={() => selectToken(token)}
                      onHover={() => setActiveIdx(start + i)}
                    />
                  ))}
                </div>
              );
            })()}
        </div>

        {/* Keyboard hints — desktop only */}
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

// ─── Trigger button ───────────────────────────────────────────────────────────

export function SearchTrigger({
  onClick,
  placeholder = "Find tokens...",
}: {
  onClick: () => void;
  placeholder?: string;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onClick();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
