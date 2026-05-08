"use client";

import { useState, useMemo } from "react";
import { Validator } from "@/hooks/useValidators";
import Link from "next/link";
import { MagnifyingGlass, ChartLineUp, Lightning, CaretDown, CaretUp } from "@phosphor-icons/react";

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
    <div className="flex flex-col gap-8">
      {/* Search Bar - Matches tg-search style */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="tg-search !h-12 !max-w-md">
          <MagnifyingGlass size={18} className="tg-search__icon" />
          <input
            type="text"
            placeholder="Search network nodes..."
            className="tg-search__input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3">
           <div className="tc-pill tc-pill--sym">
             <ChartLineUp size={14} weight="bold" />
             {filteredValidators.length} Active Nodes
           </div>
        </div>
      </div>

      {/* List - Matches tc-list-row style */}
      <div className="flex flex-col">
        <div className="tc-list-header !grid-cols-[60px_1fr_100px_100px_140px_100px] !hidden md:grid">
          <div>Rank</div>
          <div>Validator</div>
          <div className="cursor-pointer hover:text-[var(--tc-text-primary)] transition-colors flex items-center gap-1" onClick={() => toggleSort("commission")}>
            Comm. {sortKey === "commission" && (sortDir === "asc" ? <CaretUp size={10} /> : <CaretDown size={10} />)}
          </div>
          <div className="cursor-pointer hover:text-[var(--tc-text-primary)] transition-colors flex items-center gap-1" onClick={() => toggleSort("apy")}>
            APY {sortKey === "apy" && (sortDir === "asc" ? <CaretUp size={10} /> : <CaretDown size={10} />)}
          </div>
          <div className="cursor-pointer hover:text-[var(--tc-text-primary)] transition-colors flex items-center gap-1" onClick={() => toggleSort("activatedStake")}>
            Stake {sortKey === "activatedStake" && (sortDir === "asc" ? <CaretUp size={10} /> : <CaretDown size={10} />)}
          </div>
          <div></div>
        </div>

        <div className="flex flex-col gap-2">
          {filteredValidators.map((v) => (
            <Link 
              key={v.votingPubkey} 
              href={`/validators/${v.votingPubkey}`}
              className="tc-list-row !grid-cols-1 md:!grid-cols-[60px_1fr_100px_100px_140px_100px] !gap-4 md:!gap-3 !p-4 hover:shadow-lg transition-all no-underline group"
            >
              <div className="hidden md:flex text-[11px] font-black text-[var(--tc-text-muted)] font-mono">
                 #{v.rank}
              </div>
              
              <div className="tc-list-row__identity">
                {v.avatar ? (
                  <img src={v.avatar} alt={v.name} className="w-10 h-10 rounded-xl border border-[var(--tc-border)] group-hover:scale-105 transition-transform" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-[var(--tc-surface)] border border-[var(--tc-border)] flex items-center justify-center text-[12px] font-black">
                    {v.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="tc-list-row__name">{v.name}</span>
                    {v.isJito && (
                      <span className="tc-badge tc-badge--t1 !text-[8px] !px-1.5">Jito</span>
                    )}
                  </div>
                  <span className="tc-list-row__symbol truncate opacity-60">
                    {v.votingPubkey.slice(0, 6)}...{v.votingPubkey.slice(-6)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col md:block">
                <span className="text-[10px] text-[var(--tc-text-muted)] md:hidden uppercase font-black mb-1">Commission</span>
                <span className="text-[14px] font-black text-[var(--tc-text-primary)]">{v.commission}%</span>
              </div>

              <div className="flex flex-col md:block">
                <span className="text-[10px] text-[var(--tc-text-muted)] md:hidden uppercase font-black mb-1">Yield APY</span>
                <span className="text-[15px] font-black text-[var(--tc-accent-up)]">{v.apy.toFixed(2)}%</span>
              </div>

              <div className="flex flex-col md:block">
                <span className="text-[10px] text-[var(--tc-text-muted)] md:hidden uppercase font-black mb-1">Active Stake</span>
                <span className="text-[14px] font-bold text-[var(--tc-text-primary)]">{(v.activatedStake / 1e6).toFixed(1)}M <span className="text-[10px] text-[var(--tc-text-muted)]">SOL</span></span>
              </div>

              <div className="flex justify-end">
                <div className="tg-btn-primary !h-9 !px-6 !text-[11px] !rounded-xl !uppercase !tracking-widest group-hover:scale-105 transition-transform">
                  Stake
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
