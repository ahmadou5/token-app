"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTokens } from "@/hooks/useToken";
import { fmtPrice } from "@/components/TokenCard";
import { useSearchStore, type RecentSearch } from "@/store/useSearchStore";
import type { AnyToken } from "@/hooks/useToken";
import type { ValidatorInfo } from "@/types/validator";

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtVol(n: number | null | undefined): string {
  if (n == null) return "";
  if (n >= 1e9) return `Vol: $${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `Vol: $${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `Vol: $${(n / 1e3).toFixed(2)}K`;
  return `Vol: $${n.toFixed(2)}`;
}

function fmtStake(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B SOL`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M SOL`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K SOL`;
  return `${n.toFixed(0)} SOL`;
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

function ValidatorRow({
  validator,
  active,
  onSelect,
  onHover,
}: {
  validator: ValidatorInfo;
  active: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  const name = validator.name || safeInitials(validator.address);
  const apy = validator.apy ?? validator.totalApy ?? 0;
  const commission = validator.commission ?? 0;
  const status = validator.status ?? "active";

  return (
    <div
      className={`srch-row ${active ? "srch-row--active" : ""}`}
      onClick={onSelect}
      onMouseEnter={onHover}
      role="option"
      aria-selected={active}
    >
      {/* Avatar */}
      <div className="srch-avatar" style={{ borderRadius: "10px" }}>
        {validator.avatar ? (
          <img
            src={validator.avatar}
            alt={name}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const p = e.currentTarget.parentElement;
              if (p) p.textContent = safeInitials(name);
            }}
          />
        ) : (
          safeInitials(name)
        )}
      </div>

      <div className="srch-row__body">
        <div className="srch-row__top">
          <span className="srch-name">{name}</span>
          {/* Status dot */}
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: status === "active" ? "var(--tc-accent-up)" : "var(--tc-accent-down)",
              flexShrink: 0,
              display: "inline-block",
            }}
          />
        </div>
        <div className="srch-row__bottom">
          <span className="srch-vol">
            {fmtStake(validator.stake / 1e9)} staked
          </span>
          <span className="srch-vol" style={{ marginLeft: 4 }}>
            · {commission}% commission
          </span>
        </div>
      </div>

      {/* APY badge on the right */}
      {apy > 0 && (
        <span
          style={{
            fontFamily: "var(--tc-font-mono)",
            fontSize: 12,
            fontWeight: 600,
            color: "var(--tc-accent-up)",
            flexShrink: 0,
            minWidth: 52,
            textAlign: "right",
          }}
        >
          {apy.toFixed(2)}%
        </span>
      )}
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

// ─── Tab pill ──────────────────────────────────────────────────────────────────
function TabBar({
  active,
  onChange,
}: {
  active: "tokens" | "validators";
  onChange: (t: "tokens" | "validators") => void;
}) {
  return (
    <div className="srch-tab-bar">
      {(["tokens", "validators"] as const).map((tab) => (
        <button
          key={tab}
          className={`srch-tab ${active === tab ? "srch-tab--active" : ""}`}
          onClick={() => onChange(tab)}
        >
          {tab === "tokens" ? (
            <>
              <BarIcon /> Tokens
            </>
          ) : (
            <>
              <ValidatorIcon /> Validators
            </>
          )}
        </button>
      ))}
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

const ValidatorIcon = () => (
  <svg viewBox="0 0 14 14" fill="none" width="12" height="12">
    <circle cx="7" cy="4" r="2.5" stroke="currentColor" strokeWidth="1.2" />
    <path
      d="M2 12c0-2.761 2.239-5 5-5s5 2.239 5 5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <path
      d="M5.5 10.5l1.5 1.5 2-2"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
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

  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const [activeTab, setActiveTab] = useState<"tokens" | "validators">("tokens");

  // Validators state
  const [validators, setValidators] = useState<ValidatorInfo[]>([]);
  const [validatorsLoading, setValidatorsLoading] = useState(false);

  const prevOpenRef = useRef(false);

  const { tokens, isSearching } = useTokens();
  const {
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
  } = useSearchStore();

  // ── Fetch validators when modal opens (lazy) ──────────────────────────────
  useEffect(() => {
    if (!open || validators.length > 0) return;
    let cancelled = false;
    setValidatorsLoading(true);

    fetch("/api/validators")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          setValidators((data.validators || []).slice(0, 100));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setValidatorsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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

  // Validator filtering
  const filteredValidators = trimmed
    ? validators
        .filter((v) => {
          const n = (v.name ?? "").toLowerCase();
          const a = (v.address ?? "").toLowerCase();
          const vk = (v.votingPubkey ?? "").toLowerCase();
          return n.includes(trimmed) || a.includes(trimmed) || vk.includes(trimmed);
        })
        .slice(0, 10)
    : validators.slice(0, 8);

  const showRecent = !trimmed && recentSearches.length > 0 && activeTab === "tokens";
  const showTokenResults = !!trimmed && activeTab === "tokens";
  const showTopTokens = !trimmed && activeTab === "tokens";
  const showValidators = activeTab === "validators";

  type NavItem =
    | { type: "recent"; entry: RecentSearch }
    | { type: "token"; token: AnyToken }
    | { type: "validator"; validator: ValidatorInfo };

  const navItems: NavItem[] = [
    ...(showRecent
      ? recentSearches.map((e) => ({ type: "recent" as const, entry: e }))
      : []),
    ...(showTokenResults
      ? localFiltered.map((t) => ({ type: "token" as const, token: t }))
      : []),
    ...(showTopTokens
      ? topByVolume.map((t) => ({ type: "token" as const, token: t }))
      : []),
    ...(showValidators
      ? filteredValidators.map((v) => ({ type: "validator" as const, validator: v }))
      : []),
  ];

  // ── Sync open state ────────────────────────────────────────────────────────
  if (open && !prevOpenRef.current) {
    prevOpenRef.current = true;
  }
  if (!open && prevOpenRef.current) {
    prevOpenRef.current = false;
  }

  // Focus input
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);

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

  function selectValidator(validator: ValidatorInfo) {
    router.push(`/network/${validator.votingPubkey}`);
    onClose();
  }

  function handleQueryChange(val: string) {
    setQuery(val);
    setActiveIdx(0);
  }

  // ── Keyboard navigation ────────────────────────────────────────────────────

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
        else if (item.type === "token") selectToken(item.token);
        else if (item.type === "validator") selectValidator(item.validator);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeIdx, navItems.length]);

  if (!open) return null;

  let off = 0;

  return (
    <>
      <div className="srch-backdrop" onClick={onClose} aria-hidden />

      <div
        className="srch-modal"
        role="dialog"
        aria-modal
        aria-label="Search tokens and validators"
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
            placeholder={
              activeTab === "tokens"
                ? "Search tokens..."
                : "Search validators..."
            }
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          {(isSearching || validatorsLoading) && (
            <span className="srch-spinner" />
          )}
          {query && (
            <button
              className="srch-clear"
              onClick={() => handleQueryChange("")}
            >
              ✕
            </button>
          )}
        </div>

        {/* Tab bar */}
        <TabBar active={activeTab} onChange={(t) => { setActiveTab(t); setActiveIdx(0); }} />

        <div className="srch-divider" />

        <div className="srch-list" role="listbox">
          {/* ── TOKENS TAB ── */}
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

          {showTokenResults &&
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

          {showTopTokens &&
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

          {/* ── VALIDATORS TAB ── */}
          {showValidators &&
            (() => {
              const start = off;
              return (
                <div className="srch-section" key="validators">
                  <SectionLabel
                    icon={<ValidatorIcon />}
                    label={
                      trimmed
                        ? `Validators for "${query}"`
                        : "Top validators by stake"
                    }
                    action={
                      <a
                        href="/network"
                        style={{
                          fontSize: 11,
                          color: "var(--tc-accent)",
                          textDecoration: "none",
                          fontWeight: 500,
                        }}
                        onClick={onClose}
                      >
                        View all →
                      </a>
                    }
                  />
                  {validatorsLoading ? (
                    <div className="srch-empty" style={{ padding: "24px 16px" }}>
                      <span className="srch-spinner" style={{ margin: "0 auto" }} />
                    </div>
                  ) : filteredValidators.length > 0 ? (
                    filteredValidators.map((v, i) => (
                      <ValidatorRow
                        key={v.votingPubkey ?? v.address ?? i}
                        validator={v}
                        active={activeIdx === start + i}
                        onSelect={() => selectValidator(v)}
                        onHover={() => setActiveIdx(start + i)}
                      />
                    ))
                  ) : (
                    <div className="srch-empty">No validators found</div>
                  )}
                </div>
              );
            })()}
        </div>

        {/* Keyboard hints */}
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
      aria-label="Search tokens and validators"
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
