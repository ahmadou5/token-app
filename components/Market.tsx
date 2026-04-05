"use client";

import { useState } from "react";
import type { AssetMarket } from "@/types";
import { fmtCompact } from "@/components/TokenCard";

interface AssetToken {
  symbol?: string;
  icon?: string;
}

interface ExtendedAssetMarket extends AssetMarket {
  trades24h?: number;
  trades24hChange?: number;
  wallets24h?: number;
  wallets24hChange?: number;
}

// ─── Safe helpers ─────────────────────────────────────────────────────────────

function safeStr(s: unknown): string {
  return s && typeof s === "string" ? s : "";
}

function safeInitials(s: unknown): string {
  const str = safeStr(s);
  return str.length > 0 ? str.slice(0, 2).toUpperCase() : "??";
}

function truncateMint(mint: unknown): string {
  const m = safeStr(mint);
  if (m.length <= 10) return m;
  return `${m.slice(0, 4)}…${m.slice(-4)}`;
}

// ─── Pair icon stack ──────────────────────────────────────────────────────────

function PairIcons({
  baseIcon,
  quoteIcon,
  baseSymbol,
  quoteSymbol,
}: {
  baseIcon?: string | null;
  quoteIcon?: string | null;
  baseSymbol?: string | null;
  quoteSymbol?: string | null;
}) {
  const bSym = safeStr(baseSymbol);
  const qSym = safeStr(quoteSymbol);
  const bInit = safeInitials(bSym);
  const qInit = safeInitials(qSym);

  return (
    <div className="mkt-pair-icons">
      <div className="mkt-icon mkt-icon--base">
        {baseIcon && typeof baseIcon === "string" ? (
          <img
            src={baseIcon}
            alt={bSym}
            className="mkt-icon__img"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const p = e.currentTarget.parentElement;
              if (p) p.textContent = bInit;
            }}
          />
        ) : (
          bInit
        )}
      </div>
      <div className="mkt-icon mkt-icon--quote">
        {quoteIcon && typeof quoteIcon === "string" ? (
          <img
            src={quoteIcon}
            alt={qSym}
            className="mkt-icon__img"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const p = e.currentTarget.parentElement;
              if (p) p.textContent = qInit;
            }}
          />
        ) : (
          qInit
        )}
      </div>
    </div>
  );
}

// ─── Sort ─────────────────────────────────────────────────────────────────────

type SortKey = "liquidity" | "volume24h";
type SortDir = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <svg
      viewBox="0 0 10 12"
      fill="none"
      width="8"
      height="10"
      className={`mkt-sort ${active ? "mkt-sort--active" : ""}`}
    >
      <path
        d="M5 1v10M2 9l3 3 3-3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ opacity: active && dir === "desc" ? 1 : 0.3 }}
      />
      <path
        d="M5 11V1M2 3l3-3 3 3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ opacity: active && dir === "asc" ? 1 : 0.3 }}
      />
    </svg>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const PAGE_SIZES = [10, 25, 50];

interface MarketsSectionProps {
  markets: AssetMarket[];
  total: number;
}

export function MarketsSection({ markets, total }: MarketsSectionProps) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<SortKey>("liquidity");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Guard: ensure markets is a valid array
  const safeMarkets = Array.isArray(markets) ? markets.filter(Boolean) : [];

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(1);
  };

  const sorted = [...safeMarkets].sort((a, b) => {
    const va = (a as Record<SortKey, number | undefined>)[sortKey] ?? 0;
    const vb = (b as Record<SortKey, number | undefined>)[sortKey] ?? 0;
    return sortDir === "desc" ? vb - va : va - vb;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
  const pageItems = sorted.slice((page - 1) * perPage, page * perPage);

  if (safeMarkets.length === 0) return null;

  return (
    <section className="td-section">
      <h2 className="td-section__title">Markets</h2>
      <div className="mkt-table-wrap">
        {/* Header */}
        <div className="mkt-header">
          <span className="mkt-col--pair">Pair</span>
          <button
            className="mkt-col--liq mkt-sort-btn"
            onClick={() => handleSort("liquidity")}
          >
            Liquidity{" "}
            <SortIcon active={sortKey === "liquidity"} dir={sortDir} />
          </button>
          <button
            className="mkt-col--vol mkt-sort-btn"
            onClick={() => handleSort("volume24h")}
          >
            24h Volume{" "}
            <SortIcon active={sortKey === "volume24h"} dir={sortDir} />
          </button>
          <span className="mkt-col--trades">24h Trades</span>
          <span className="mkt-col--wallets">24h Wallets</span>
        </div>

        {/* Rows */}
        {pageItems.map((mkt, i) => {
          const base = mkt?.base ?? {};
          const quote = mkt?.quote ?? {};
          const bSym = safeStr((base as AssetToken).symbol);
          const qSym = safeStr((quote as AssetToken).symbol);
          const bIcon = (base as AssetToken).icon ?? null;
          const qIcon = (quote as AssetToken).icon ?? null;
          const source = safeStr(mkt?.source);
          const addr = safeStr(mkt?.address);

          return (
            <div key={`${addr}-${i}`} className="mkt-row">
              {/* Pair */}
              <div className="mkt-col--pair mkt-pair">
                <PairIcons
                  baseIcon={bIcon}
                  quoteIcon={qIcon}
                  baseSymbol={bSym}
                  quoteSymbol={qSym}
                />
                <div className="mkt-pair__info">
                  <div className="mkt-pair__name">
                    <span className="mkt-pair__base">{bSym}</span>
                    <span className="mkt-pair__slash"> / </span>
                    <span className="mkt-pair__quote">{qSym}</span>
                    {source && (
                      <span className="mkt-pair__source">{source}</span>
                    )}
                  </div>
                  {addr && (
                    <div className="mkt-pair__addr">
                      {truncateMint(addr)}
                      <svg
                        viewBox="0 0 12 12"
                        fill="none"
                        width="10"
                        height="10"
                        className="mkt-pair__ext"
                      >
                        <path
                          d="M2 10L10 2M10 2H5M10 2v5"
                          stroke="currentColor"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* Liquidity */}
              <div className="mkt-col--liq mkt-num">
                {fmtCompact(mkt?.liquidity)}
              </div>
              {/* Volume */}
              <div className="mkt-col--vol mkt-num">
                {fmtCompact(mkt?.volume24h)}
              </div>
              {/* Trades — use real field if available, fallback to — */}
              <div className="mkt-col--trades mkt-num-stack">
                <span className="mkt-num">
                  {(mkt as ExtendedAssetMarket)?.trades24h != null
                    ? Number(
                        (mkt as ExtendedAssetMarket).trades24h,
                      ).toLocaleString()
                    : "—"}
                </span>
                {(mkt as ExtendedAssetMarket)?.trades24hChange != null && (
                  <span
                    className={`mkt-pct ${(mkt as ExtendedAssetMarket).trades24hChange! >= 0 ? "mkt-pct--up" : "mkt-pct--dn"}`}
                  >
                    {(mkt as ExtendedAssetMarket).trades24hChange! >= 0
                      ? "+"
                      : ""}
                    {Number(
                      (mkt as ExtendedAssetMarket).trades24hChange!,
                    ).toFixed(2)}
                    %
                  </span>
                )}
              </div>
              {/* Wallets */}
              <div className="mkt-col--wallets mkt-num-stack">
                <span className="mkt-num">
                  {(mkt as ExtendedAssetMarket)?.wallets24h != null
                    ? Number(
                        (mkt as ExtendedAssetMarket).wallets24h,
                      ).toLocaleString()
                    : "—"}
                </span>
                {(mkt as ExtendedAssetMarket)?.wallets24hChange != null && (
                  <span
                    className={`mkt-pct ${(mkt as ExtendedAssetMarket).wallets24hChange! >= 0 ? "mkt-pct--up" : "mkt-pct--dn"}`}
                  >
                    {(mkt as ExtendedAssetMarket).wallets24hChange! >= 0
                      ? "+"
                      : ""}
                    {Number(
                      (mkt as ExtendedAssetMarket).wallets24hChange!,
                    ).toFixed(2)}
                    %
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Footer */}
        <div className="mkt-footer">
          <span className="mkt-footer__info">
            Showing {Math.min((page - 1) * perPage + 1, sorted.length)}–
            {Math.min(page * perPage, sorted.length)} of {sorted.length} markets
          </span>
          <div className="mkt-footer__controls">
            <span className="mkt-footer__label">Per page</span>
            <select
              className="mkt-footer__select"
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              className="mkt-footer__nav"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <svg viewBox="0 0 8 12" fill="none" width="7" height="11">
                <path
                  d="M6 10L2 6l4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <span className="mkt-footer__page">
              Page {page} of {totalPages}
            </span>
            <button
              className="mkt-footer__nav"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <svg viewBox="0 0 8 12" fill="none" width="7" height="11">
                <path
                  d="M2 2l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
