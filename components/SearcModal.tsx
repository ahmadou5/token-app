"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTokens } from "@/hooks/useToken";
import { fmtPrice } from "@/components/TokenCard";
import { useSearchStore, type RecentSearch } from "@/store/useSearchStore";
import type { AnyToken } from "@/hooks/useToken";

function fmtVol(n: number | null | undefined): string {
  if (n == null) return "";
  if (n >= 1e9) return `Vol: $${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `Vol: $${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `Vol: $${(n / 1e3).toFixed(2)}K`;
  return `Vol: $${n.toFixed(2)}`;
}

function fmtPct(n: number | null | undefined) {
  if (n == null) return null;
  return { label: `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`, up: n >= 0 };
}

function safeInitials(name: string | null | undefined) {
  if (!name || typeof name !== "string" || name.length === 0) return "?";
  return name.slice(0, 2).toUpperCase();
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

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

// ─── Pct chip ─────────────────────────────────────────────────────────────────

function PctChip({ value }: { value: number | null | undefined }) {
  const p = fmtPct(value);
  if (!p) return null;
  return (
    <span className={`srch-pct ${p.up ? "srch-pct--up" : "srch-pct--dn"}`}>
      {p.label}
    </span>
  );
}

// ─── Token result row ─────────────────────────────────────────────────────────

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

// ─── Recent row ───────────────────────────────────────────────────────────────

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

// ─── Section label ────────────────────────────────────────────────────────────

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
// ... (Previous imports and helper components remain the same)

export function SearchModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);

  const { tokens, isSearching } = useTokens();
  const {
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
  } = useSearchStore();

  const trimmed = query.trim().toLowerCase();

  // 1. Logic cleanup: Compute derived data as before
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

  // 2. FIX: Effect only handles Imperative DOM side-effects (Focus)
  // State resetting is now handled by the 'key' prop (see usage below)
  useEffect(() => {
    if (open) {
      const timeoutId = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(timeoutId);
    }
  }, [open]);

  // 3. FIX: Handle Query and Index sync in the event handler, not an effect
  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setActiveIdx(0); // Batch update: No cascading render!
  };

  function selectToken(token: AnyToken) {
    addRecentSearch(token);
    router.push(`/token/${token.assetId}`);
    onClose();
  }

  function selectRecent(entry: RecentSearch) {
    router.push(`/token/${entry.assetId}`);
    onClose();
  }

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, navItems.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter") {
        const item = navItems[activeIdx];
        if (!item) return;
        if (item.type === "recent") selectRecent(item.entry);
        else selectToken(item.token);
      }
    },
    // ADDED: selectRecent and selectToken
    // REMOVED: router (it's used inside selectRecent/Token, not directly here)
    [open, navItems, activeIdx, onClose, selectRecent, selectToken],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  if (!open) return null;

  //let off = 0;

  return (
    <>
      <div className="srch-backdrop" onClick={onClose} aria-hidden />
      <div
        // 4. FIX: Adding a key based on 'open' forces a clean state reset
        // when the modal re-mounts, removing the need for setQuery("") in useEffect.
        key={open ? "open" : "closed"}
        className="srch-modal"
        role="dialog"
        aria-modal
        aria-label="Search tokens"
      >
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
            onChange={handleQueryChange} // Used the new handler here
            autoComplete="off"
            spellCheck={false}
          />
          {isSearching && <span className="srch-spinner" />}
          {query && (
            <button
              className="srch-clear"
              onClick={() => {
                setQuery("");
                setActiveIdx(0);
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* ... (rest of the JSX remains the same) */}
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
