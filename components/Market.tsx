"use client";

/**
 * MarketsSection — fires onAddLiquidity(market) to parent.
 * The parent (TokenDetailPage) owns the active market state
 * and renders AddLiquidityCard in the sidebar / bottom sheet.
 */

import { useState } from "react";
import type { MarketEntry } from "@/types/token.types";
import { fmtCompact } from "@/components/TokenCard";
import { resolveProtocol } from "@/lib/marketProtocol";

function truncateMint(mint: unknown): string {
  const m = mint && typeof mint === "string" ? mint : "";
  if (m.length <= 10) return m;
  return `${m.slice(0, 4)}…${m.slice(-4)}`;
}

function safeInitials(s: string | undefined): string {
  return s && s.length > 0 ? s.slice(0, 2).toUpperCase() : "??";
}

function PairIcons({
  baseIcon,
  quoteIcon,
  baseSymbol,
  quoteSymbol,
}: {
  baseIcon?: string | null;
  quoteIcon?: string | null;
  baseSymbol?: string;
  quoteSymbol?: string;
}) {
  const bInit = safeInitials(baseSymbol);
  const qInit = safeInitials(quoteSymbol);
  return (
    <div className="mkt-pair-icons">
      <div className="mkt-icon mkt-icon--base">
        {baseIcon ? (
          <img
            src={baseIcon}
            alt={baseSymbol}
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
        {quoteIcon ? (
          <img
            src={quoteIcon}
            alt={quoteSymbol}
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

const PAGE_SIZES = [10, 25, 50];

interface MarketsSectionProps {
  markets: MarketEntry[];
  total: number;
  /** Address of the market currently open in the sidebar (for highlight) */
  activeMarketAddress: string | null;
  /** Called when user clicks Add on a pool row */
  onAddLiquidity: (market: MarketEntry) => void;
}

export function MarketsSection({
  markets,
  total,
  activeMarketAddress,
  onAddLiquidity,
}: MarketsSectionProps) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [sortKey, setSortKey] = useState<SortKey>("liquidity");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

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
    const va = a[sortKey] ?? 0;
    const vb = b[sortKey] ?? 0;
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
        <div className="mkt-header mkt-header--with-action">
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
          <span className="mkt-col--action">Action</span>
        </div>

        {/* Rows */}
        {pageItems.map((mkt, i) => {
          const bSym = mkt.base?.symbol;
          const qSym = mkt.quote?.symbol;
          const bIcon = mkt.base?.icon ?? null;
          const qIcon = mkt.quote?.icon ?? null;
          const proto = resolveProtocol(mkt.source);
          const isCLMM = proto.canAddLiquidity;
          const isActive = activeMarketAddress === mkt.address;

          return (
            <div
              key={`${mkt.address}-${i}`}
              className={`mkt-row mkt-row--with-action${isCLMM ? " mkt-row--clmm" : ""}${isActive ? " mkt-row--active-liq" : ""}`}
            >
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
                    <span className="mkt-pair__base">{bSym ?? "—"}</span>
                    <span className="mkt-pair__slash"> / </span>
                    <span className="mkt-pair__quote">{qSym ?? "—"}</span>
                    {mkt.source && (
                      <span className="mkt-pair__source">{mkt.source}</span>
                    )}
                  </div>
                  {mkt.address && (
                    <div className="mkt-pair__addr">
                      {truncateMint(mkt.address)}
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

              <div className="mkt-col--liq mkt-num">
                {fmtCompact(mkt.liquidity)}
              </div>
              <div className="mkt-col--vol mkt-num">
                {fmtCompact(mkt.volume24h)}
              </div>

              <div className="mkt-col--trades mkt-num-stack">
                <span className="mkt-num">
                  {mkt.trade24h != null ? mkt.trade24h.toLocaleString() : "—"}
                </span>
                {mkt.trade24hChangePercent != null && (
                  <span
                    className={`mkt-pct ${mkt.trade24hChangePercent >= 0 ? "mkt-pct--up" : "mkt-pct--dn"}`}
                  >
                    {mkt.trade24hChangePercent >= 0 ? "+" : ""}
                    {mkt.trade24hChangePercent.toFixed(2)}%
                  </span>
                )}
              </div>

              <div className="mkt-col--wallets mkt-num-stack">
                <span className="mkt-num">
                  {mkt.uniqueWallet24h != null
                    ? mkt.uniqueWallet24h.toLocaleString()
                    : "—"}
                </span>
                {mkt.uniqueWallet24hChangePercent != null && (
                  <span
                    className={`mkt-pct ${mkt.uniqueWallet24hChangePercent >= 0 ? "mkt-pct--up" : "mkt-pct--dn"}`}
                  >
                    {mkt.uniqueWallet24hChangePercent >= 0 ? "+" : ""}
                    {mkt.uniqueWallet24hChangePercent.toFixed(2)}%
                  </span>
                )}
              </div>

              {/* Action */}
              <div className="mkt-col--action">
                {isCLMM ? (
                  <button
                    className={`mkt-add-liq-btn ${isActive ? "mkt-add-liq-btn--active" : ""}`}
                    onClick={() => onAddLiquidity(mkt)}
                    title={
                      isActive
                        ? "Close liquidity panel"
                        : "Add liquidity to this pool"
                    }
                  >
                    {isActive ? (
                      <>
                        <svg
                          viewBox="0 0 12 12"
                          fill="none"
                          width="10"
                          height="10"
                          aria-hidden
                        >
                          <path
                            d="M2 2l8 8M10 2L2 10"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                          />
                        </svg>
                        Close
                      </>
                    ) : (
                      <>
                        <svg
                          viewBox="0 0 12 12"
                          fill="none"
                          width="10"
                          height="10"
                          aria-hidden
                        >
                          <path
                            d="M6 1v10M1 6h10"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                          />
                        </svg>
                        Add
                      </>
                    )}
                  </button>
                ) : (
                  <span className="mkt-action-none">—</span>
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
