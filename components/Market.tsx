"use client";

import { useState } from "react";
import type { AssetMarket } from "@/types";
import { fmtCompact } from "@/components/TokenCard";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtChange(n: number | null | undefined) {
  if (n == null) return null;
  return { value: n, label: `${n >= 0 ? "+" : ""}${n.toFixed(2)}%` };
}

function truncateMint(mint: string) {
  if (mint.length <= 10) return mint;
  return `${mint.slice(0, 4)}…${mint.slice(-4)}`;
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash >>> 0;
}

function deterministicRand(value: string) {
  const h = hashString(value);
  return (h % 100000) / 100000;
}

function fmtDeterministicChange(key: string, upMax: number, downMax: number) {
  const dir = deterministicRand(`${key}-dir`) > 0.5 ? 1 : -1;
  const magnitude =
    dir > 0
      ? deterministicRand(`${key}-up`) * upMax
      : deterministicRand(`${key}-down`) * downMax;
  return fmtChange(dir * magnitude);
}

// ─── Pair icon stack ──────────────────────────────────────────────────────────

function PairIcons({
  baseIcon,
  quoteIcon,
  baseSymbol,
  quoteSymbol,
}: {
  baseIcon?: string;
  quoteIcon?: string;
  baseSymbol: string;
  quoteSymbol: string;
}) {
  const initials = (s: string) => s.slice(0, 2).toUpperCase();

  return (
    <div className="mkt-pair-icons">
      {/* Base */}
      <div className="mkt-icon mkt-icon--base">
        {baseIcon ? (
          <img
            src={baseIcon}
            alt={baseSymbol}
            className="mkt-icon__img"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              if (e.currentTarget.parentElement)
                e.currentTarget.parentElement.textContent =
                  initials(baseSymbol);
            }}
          />
        ) : (
          initials(baseSymbol)
        )}
      </div>
      {/* Quote */}
      <div className="mkt-icon mkt-icon--quote">
        {quoteIcon ? (
          <img
            src={quoteIcon}
            alt={quoteSymbol}
            className="mkt-icon__img"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              if (e.currentTarget.parentElement)
                e.currentTarget.parentElement.textContent =
                  initials(quoteSymbol);
            }}
          />
        ) : (
          initials(quoteSymbol)
        )}
      </div>
    </div>
  );
}

// ─── Sort indicator ───────────────────────────────────────────────────────────

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

// ─── Main component ───────────────────────────────────────────────────────────

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

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(1);
  };

  const sorted = [...markets].sort((a, b) => {
    const va = a[sortKey] ?? 0;
    const vb = b[sortKey] ?? 0;
    return sortDir === "desc" ? vb - va : va - vb;
  });

  const totalPages = Math.ceil(sorted.length / perPage);
  const pageItems = sorted.slice((page - 1) * perPage, page * perPage);

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
          // Mock % changes — real API would supply these
          const tradesChange = fmtDeterministicChange(
            `${mkt.address}-trades`,
            500,
            100,
          );
          const walletsChange = fmtDeterministicChange(
            `${mkt.address}-wallets`,
            200,
            100,
          );

          return (
            <div key={`${mkt.address}-${i}`} className="mkt-row">
              {/* Pair col */}
              <div className="mkt-col--pair mkt-pair">
                <PairIcons
                  baseIcon={mkt.base.icon}
                  quoteIcon={mkt.quote.icon}
                  baseSymbol={mkt.base.symbol}
                  quoteSymbol={mkt.quote.symbol}
                />
                <div className="mkt-pair__info">
                  <div className="mkt-pair__name">
                    <span className="mkt-pair__base">{mkt.base.symbol}</span>
                    <span className="mkt-pair__slash"> / </span>
                    <span className="mkt-pair__quote">{mkt.quote.symbol}</span>
                    {mkt.source && (
                      <span className="mkt-pair__source">{mkt.source}</span>
                    )}
                  </div>
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
                </div>
              </div>

              {/* Liquidity */}
              <div className="mkt-col--liq mkt-num">
                {fmtCompact(mkt.liquidity)}
              </div>

              {/* Volume */}
              <div className="mkt-col--vol mkt-num">
                {fmtCompact(mkt.volume24h)}
              </div>

              {/* 24h Trades */}
              <div className="mkt-col--trades mkt-num-stack">
                <span className="mkt-num">
                  {Math.floor(deterministicRand(`${mkt.address}-trades`) * 10000).toLocaleString()}
                </span>
                {tradesChange && (
                  <span
                    className={`mkt-pct ${tradesChange.value >= 0 ? "mkt-pct--up" : "mkt-pct--dn"}`}
                  >
                    {tradesChange.label}
                  </span>
                )}
              </div>

              {/* 24h Wallets */}
              <div className="mkt-col--wallets mkt-num-stack">
                <span className="mkt-num">
                  {Math.floor(deterministicRand(`${mkt.address}-wallets`) * 1000).toLocaleString()}
                </span>
                {walletsChange && (
                  <span
                    className={`mkt-pct ${walletsChange.value >= 0 ? "mkt-pct--up" : "mkt-pct--dn"}`}
                  >
                    {walletsChange.label}
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {/* Pagination footer */}
        <div className="mkt-footer">
          <span className="mkt-footer__info">
            Showing {(page - 1) * perPage + 1}–
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
