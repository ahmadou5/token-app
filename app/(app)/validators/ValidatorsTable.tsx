"use client";

import { useState, useMemo } from "react";
import { Validator } from "@/hooks/useValidators";
import Link from "next/link";

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
    let list = initialValidators.filter((v) =>
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.votingPubkey.toLowerCase().includes(search.toLowerCase())
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
    <div className="vl-content flex flex-col gap-6">
      <div className="vl-search-box relative max-w-md">
        <input
          type="text"
          placeholder="Search validator name or address…"
          className="vl-search-input w-full p-3 pl-10 rounded-xl bg-[var(--tc-bg)] border border-[var(--tc-border)] text-[var(--tc-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--tc-accent)] focus:ring-opacity-20"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tc-text-muted)]"
          viewBox="0 0 16 16"
          fill="none"
          width="16"
          height="16"
        >
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      <div className="vl-table-wrap overflow-x-auto rounded-xl border border-[var(--tc-border)] bg-[var(--tc-bg)] shadow-sm">
        <table className="vl-table w-full border-collapse text-left">
          <thead className="vl-thead bg-[var(--tc-surface)] border-bottom border-[var(--tc-border)] text-[var(--tc-text-muted)] text-[10px] font-semibold uppercase letter-spacing-[0.05em]">
            <tr>
              <th className="p-4 w-[60px]">Rank</th>
              <th className="p-4 min-w-[200px]">Validator</th>
              <th className="p-4 cursor-pointer hover:text-[var(--tc-text-primary)] transition-colors" onClick={() => toggleSort("commission")}>
                Commission {sortKey === "commission" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
              <th className="p-4 cursor-pointer hover:text-[var(--tc-text-primary)] transition-colors" onClick={() => toggleSort("apy")}>
                APY {sortKey === "apy" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
              <th className="p-4 hidden md:table-cell cursor-pointer hover:text-[var(--tc-text-primary)] transition-colors" onClick={() => toggleSort("activatedStake")}>
                Active Stake {sortKey === "activatedStake" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
              <th className="p-4 hidden md:table-cell">Skip Rate</th>
              <th className="p-4 w-[120px]"></th>
            </tr>
          </thead>
          <tbody className="vl-tbody">
            {filteredValidators.map((v) => (
              <tr key={v.votingPubkey} className="vl-row border-bottom border-[var(--tc-divider)] hover:bg-[var(--tc-bg-hover)] transition-colors">
                <td className="p-4 text-[var(--tc-text-muted)] font-mono text-[12px]">{v.rank}</td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    {v.avatar ? (
                      <img src={v.avatar} alt={v.name} className="w-8 h-8 rounded-full border border-[var(--tc-border)]" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[var(--tc-bg-muted)] border border-[var(--tc-border)] flex items-center justify-center text-[10px] font-bold">
                        {v.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[14px] font-semibold text-[var(--tc-text-primary)] truncate">{v.name}</span>
                        {v.isJito && (
                          <span className="px-1 py-0.5 rounded bg-[#313131] text-[#00FFBD] text-[8px] font-bold uppercase tracking-wider">Jito</span>
                        )}
                      </div>
                      <span className="text-[11px] text-[var(--tc-text-muted)] font-mono truncate">{v.votingPubkey.slice(0, 4)}…{v.votingPubkey.slice(-4)}</span>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-[14px] font-medium text-[var(--tc-text-primary)]">{v.commission}%</td>
                <td className="p-4 text-[14px] font-bold text-[var(--tc-accent-up)]">{v.apy.toFixed(2)}%</td>
                <td className="p-4 hidden md:table-cell text-[14px] font-medium text-[var(--tc-text-primary)]">{v.activatedStake.toLocaleString(undefined, { maximumFractionDigits: 0 })} SOL</td>
                <td className="p-4 hidden md:table-cell text-[14px] text-[var(--tc-text-muted)]">{(v.skipRate * 100).toFixed(1)}%</td>
                <td className="p-4 text-right">
                  <Link href={`/validators/${v.votingPubkey}`} className="vl-stake-btn inline-flex items-center justify-center p-2 px-4 rounded-lg bg-[var(--tc-accent)] text-white text-[12px] font-bold no-underline hover:opacity-90 transition-opacity">
                    Stake
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
