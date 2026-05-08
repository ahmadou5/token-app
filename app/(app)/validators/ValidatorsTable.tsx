"use client";

import { useState, useMemo } from "react";
import { Validator } from "@/hooks/useValidators";
import Link from "next/link";
import { MagnifyingGlass, ChartLineUp, Lightning } from "@phosphor-icons/react";

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
    <div className="vl-content flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative group max-w-md w-full">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[var(--tc-text-muted)] group-focus-within:text-[var(--tc-accent)] transition-colors">
            <MagnifyingGlass size={20} weight="bold" />
          </div>
          <input
            type="text"
            placeholder="Search network nodes..."
            className="w-full h-14 pl-12 pr-6 rounded-2xl bg-[var(--tc-bg)]/50 backdrop-blur-md border-2 border-[var(--tc-border)] focus:border-[var(--tc-accent)] text-[var(--tc-text-primary)] font-bold focus:outline-none transition-all shadow-lg"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3 bg-[var(--tc-surface)]/50 p-2 rounded-2xl border border-[var(--tc-border)]">
           <div className="px-3 py-1.5 rounded-xl bg-[var(--tc-accent-bg)] text-[var(--tc-accent)] text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
             <ChartLineUp size={14} weight="bold" />
             {filteredValidators.length} Active Nodes
           </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border-2 border-[var(--tc-border)] bg-[var(--tc-bg)]/80 backdrop-blur-xl shadow-2xl">
        <table className="w-full border-collapse text-left">
          <thead className="bg-[var(--tc-surface)]/40 border-b border-[var(--tc-divider)]">
            <tr>
              <th className="p-5 text-[11px] font-black text-[var(--tc-text-muted)] uppercase tracking-[0.15em] w-[80px]">Rank</th>
              <th className="p-5 text-[11px] font-black text-[var(--tc-text-muted)] uppercase tracking-[0.15em]">Validator</th>
              <th className="p-5 text-[11px] font-black text-[var(--tc-text-muted)] uppercase tracking-[0.15em] cursor-pointer hover:text-[var(--tc-accent)] transition-colors" onClick={() => toggleSort("commission")}>
                <div className="flex items-center gap-2">
                  Comm. {sortKey === "commission" && (sortDir === "asc" ? "↑" : "↓")}
                </div>
              </th>
              <th className="p-5 text-[11px] font-black text-[var(--tc-text-muted)] uppercase tracking-[0.15em] cursor-pointer hover:text-[var(--tc-accent)] transition-colors" onClick={() => toggleSort("apy")}>
                <div className="flex items-center gap-2">
                  APY {sortKey === "apy" && (sortDir === "asc" ? "↑" : "↓")}
                </div>
              </th>
              <th className="p-5 text-[11px] font-black text-[var(--tc-text-muted)] uppercase tracking-[0.15em] hidden md:table-cell cursor-pointer hover:text-[var(--tc-accent)] transition-colors" onClick={() => toggleSort("activatedStake")}>
                <div className="flex items-center gap-2">
                  Stake {sortKey === "activatedStake" && (sortDir === "asc" ? "↑" : "↓")}
                </div>
              </th>
              <th className="p-5 text-right w-[140px]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--tc-divider)]">
            {filteredValidators.map((v) => (
              <tr key={v.votingPubkey} className="group hover:bg-[var(--tc-accent)]/5 transition-all duration-300">
                <td className="p-5 text-[var(--tc-text-muted)] font-black font-mono text-[13px]">
                   #{v.rank}
                </td>
                <td className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {v.avatar ? (
                        <img src={v.avatar} alt={v.name} className="w-10 h-10 rounded-xl border border-[var(--tc-border)] group-hover:scale-110 transition-transform shadow-sm" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--tc-bg-muted)] to-[var(--tc-surface)] border border-[var(--tc-border)] flex items-center justify-center text-[12px] font-black shadow-sm">
                          {v.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      {v.status === 'active' && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-[var(--tc-accent-up)] rounded-full border-2 border-[var(--tc-bg)] shadow-sm" />
                      )}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] font-black text-[var(--tc-text-primary)] truncate">{v.name}</span>
                        {v.isJito && (
                          <span className="px-1.5 py-0.5 rounded bg-[#00FFBD]/10 text-[#00FFBD] text-[9px] font-black uppercase tracking-widest border border-[#00FFBD]/20">Jito</span>
                        )}
                      </div>
                      <span className="text-[11px] text-[var(--tc-text-muted)] font-mono font-bold truncate opacity-60 group-hover:opacity-100 transition-opacity">{v.votingPubkey.slice(0, 8)}…{v.votingPubkey.slice(-8)}</span>
                    </div>
                  </div>
                </td>
                <td className="p-5 text-[15px] font-black text-[var(--tc-text-primary)]">{v.commission}%</td>
                <td className="p-5 text-[16px] font-black text-[var(--tc-accent-up)]">
                  <div className="flex items-center gap-1.5">
                    {v.apy.toFixed(2)}%
                  </div>
                </td>
                <td className="p-5 hidden md:table-cell">
                   <div className="flex flex-col">
                      <span className="text-[14px] font-black text-[var(--tc-text-primary)]">{v.activatedStake.toLocaleString(undefined, { maximumFractionDigits: 0 })} SOL</span>
                      <div className="w-24 h-1.5 bg-[var(--tc-surface)] rounded-full mt-2 overflow-hidden">
                         <div className="h-full bg-[var(--tc-accent)] opacity-40 group-hover:opacity-100 transition-all duration-700" style={{width: `${Math.min(100, (v.activatedStake / filteredValidators[0].activatedStake) * 100)}%`}} />
                      </div>
                   </div>
                </td>
                <td className="p-5 text-right">
                  <Link href={`/validators/${v.votingPubkey}`} className="inline-flex items-center justify-center h-10 px-6 rounded-xl bg-[var(--tc-accent)] text-white text-[13px] font-black no-underline hover:scale-[1.05] active:scale-[0.95] transition-all shadow-lg shadow-[var(--tc-accent)]/20">
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
