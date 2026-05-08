"use client";

import { useState, useMemo } from "react";
import { Validator } from "@/hooks/useValidators";
import Link from "next/link";
import { MagnifyingGlass, CaretDown, CaretUp } from "@phosphor-icons/react";

interface ValidatorsTableProps {
  initialValidators: Validator[];
}

type SortKey = "apy" | "commission" | "activatedStake";
type SortDir = "asc" | "desc";

export function ValidatorsTable({ initialValidators }: ValidatorsTableProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("apy");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const filteredValidators = useMemo(() => {
    let list = initialValidators.filter(
      (v) =>
        v.name.toLowerCase().includes(search.toLowerCase()) ||
        v.votingPubkey.toLowerCase().includes(search.toLowerCase()),
    );

    list.sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (sortDir === "asc") return valA > valB ? 1 : -1;
      return valA < valB ? 1 : -1;
    });

    return list;
  }, [initialValidators, search, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── Controls bar ── */}
      <div className="tg-controls" style={{ padding: 0 }}>
        <div className="tg-controls__tabs">
          {/* Sort pills */}
          <div className="tg-tabs">
            {(
              [
                { key: "apy", label: "Best APY" },
                { key: "activatedStake", label: "Most Staked" },
                { key: "commission", label: "Lowest Fee" },
              ] as { key: SortKey; label: string }[]
            ).map(({ key, label }) => (
              <button
                key={key}
                className={`tg-tab ${sortKey === key ? "tg-tab--active" : ""}`}
                onClick={() => {
                  if (sortKey === key) {
                    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                  } else {
                    setSortKey(key);
                    setSortDir("desc");
                  }
                }}
              >
                {label}
                {sortKey === key &&
                  (sortDir === "asc" ? (
                    <CaretUp size={9} weight="bold" />
                  ) : (
                    <CaretDown size={9} weight="bold" />
                  ))}
                <span className="tg-tab__count">{filteredValidators.length}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="tg-search" style={{ maxWidth: 280 }}>
          <MagnifyingGlass size={14} className="tg-search__icon" />
          <input
            type="text"
            placeholder="Search validators…"
            className="tg-search__input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              className="tg-search__clear"
              onClick={() => setSearch("")}
              aria-label="Clear"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── List header ── */}
      <div
        className="tc-list-header"
        style={{
          gridTemplateColumns: "48px 1fr 90px 90px 150px 100px",
          padding: "0 16px 8px",
        }}
      >
        <div>#</div>
        <div>Validator</div>
        <button
          style={{
            all: "unset",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
          onClick={() => toggleSort("commission")}
        >
          Comm.
          {sortKey === "commission" &&
            (sortDir === "asc" ? (
              <CaretUp size={9} />
            ) : (
              <CaretDown size={9} />
            ))}
        </button>
        <button
          style={{
            all: "unset",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
          onClick={() => toggleSort("apy")}
        >
          APY
          {sortKey === "apy" &&
            (sortDir === "asc" ? (
              <CaretUp size={9} />
            ) : (
              <CaretDown size={9} />
            ))}
        </button>
        <button
          style={{
            all: "unset",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
          onClick={() => toggleSort("activatedStake")}
        >
          Stake
          {sortKey === "activatedStake" &&
            (sortDir === "asc" ? (
              <CaretUp size={9} />
            ) : (
              <CaretDown size={9} />
            ))}
        </button>
        <div />
      </div>

      {/* ── Rows ── */}
      <div className="tg-list" style={{ padding: 0 }}>
        {filteredValidators.length === 0 && (
          <div className="tg-empty">
            <svg
              className="tg-empty__icon"
              viewBox="0 0 44 44"
              fill="none"
            >
              <circle cx="22" cy="22" r="20" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M14 22h16M22 14v16"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <p className="tg-empty__text">No validators match your search.</p>
          </div>
        )}

        {filteredValidators.map((v) => (
          <Link
            key={v.votingPubkey}
            href={`/validators/${v.votingPubkey}`}
            style={{ textDecoration: "none" }}
          >
            <div
              className="tc-list-row"
              style={{
                gridTemplateColumns: "48px 1fr 90px 90px 150px 100px",
              }}
            >
              {/* Rank */}
              <div className="tc-list-row__symbol" style={{ fontFamily: "var(--tc-font-mono)" }}>
                #{v.rank}
              </div>

              {/* Identity */}
              <div className="tc-list-row__identity">
                {v.avatar ? (
                  <img
                    src={v.avatar}
                    alt={v.name}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      border: "1px solid var(--tc-border)",
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "var(--tc-avatar-bg)",
                      border: "1px solid var(--tc-border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--tc-font-mono)",
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--tc-avatar-c)",
                      flexShrink: 0,
                    }}
                  >
                    {v.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="tc-list-row__name">{v.name}</span>
                    {v.isJito && (
                      <span className="tc-badge tc-badge--t1">Jito</span>
                    )}
                  </div>
                  <span className="tc-list-row__symbol">
                    {v.votingPubkey.slice(0, 6)}…{v.votingPubkey.slice(-6)}
                  </span>
                </div>
              </div>

              {/* Commission */}
              <div className="tc-list-row__vol">{v.commission}%</div>

              {/* APY */}
              <div
                className="tc-change tc-change--up"
                style={{ width: "fit-content" }}
              >
                {v.apy.toFixed(2)}%
              </div>

              {/* Stake */}
              <div className="tc-list-row__vol">
                {(v.activatedStake / 1e6).toFixed(1)}M{" "}
                <span style={{ color: "var(--tc-text-muted)", fontSize: 10 }}>SOL</span>
              </div>

              {/* CTA */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "5px 14px",
                    borderRadius: 20,
                    background: "var(--tc-accent)",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.02em",
                    flexShrink: 0,
                  }}
                >
                  Stake
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}