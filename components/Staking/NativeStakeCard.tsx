"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useWallet } from "@solana/connector";
import {
  useStakeTransaction,
  StakePosition,
} from "@/hooks/useStakeTransaction";
import { Validator } from "@/hooks/useValidators";

export function NativeStakeCard() {
  const { isConnected, account } = useWallet();
  const { fetchActiveStakes } = useStakeTransaction();
  const [apy, setApy] = useState<number | null>(null);
  const [stakes, setStakes] = useState<StakePosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [topValidators, setTopValidators] = useState<Validator[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/validators");
        if (res.ok) {
          const data = await res.json();
          const validators = data.validators || [];
          if (validators.length > 0) {
            // Sort by stake and take top 7
            const sorted = [...validators].sort((a, b) => b.stake - a.stake);
            setTopValidators(sorted.slice(0, 7));

            // Calculate average APY of top 10 validators as a proxy for network APY
            const top10 = sorted.slice(0, 10);
            const avgApy = top10.reduce((acc: number, v: any) => acc + (v.apy || 0), 0) / top10.length;
            setApy(avgApy);
          }
        }
      } catch (err) {
        console.error("Error fetching APY:", err);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isConnected && account) {
      fetchActiveStakes(account)
        .then(setStakes)
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [isConnected, account, fetchActiveStakes]);

  return (
    <div className="sw-card mt-6">
      <div className="sw-tabs">
        <div className="sw-tab sw-tab--active">
          <svg viewBox="0 0 14 14" fill="none" width="11" height="11">
            <path
              d="M7 2v10M2 7h10"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
            <circle
              cx="7"
              cy="7"
              r="2.5"
              stroke="currentColor"
              strokeWidth="1.3"
            />
          </svg>
          Native Staking
        </div>
      </div>

      <div className="p-4 flex flex-direction-column gap-4">
        <div className="sw-earn-card__apy-box">
          <span className="sw-earn-card__apy-label">Network APY</span>
          <div className="sw-earn-card__apy-value">
            {apy ? `${apy.toFixed(2)}%` : "7.42%"}
          </div>
          <div className="sw-earn-card__provider-tag">
            Native SOL Delegation
          </div>
        </div>

        <p className="text-[12px] text-[var(--tc-text-muted)] leading-relaxed">
          {`Earn ~7% APY by delegating SOL to a network validator. Your SOL stays
          in your wallet's stake account — you control it.`}
        </p>

        {isConnected && stakes.length > 0 && (
          <div className="flex flex-direction-column gap-2 mt-2">
            <span className="text-[11px] font-semibold text-[var(--tc-text-secondary)] uppercase letter-spacing-[0.05em]">
              Your Stakes
            </span>
            {stakes.map((s, i) => (
              <div
                key={i}
                className="flex justify-between items-center p-2 rounded-lg bg-[var(--tc-bg-muted)] border border-[var(--tc-border)]"
              >
                <div className="flex flex-direction-column">
                  <span className="text-[12px] font-medium text-[var(--tc-text-primary)] font-mono">
                    {s.validator.length > 20 ? `${s.validator.slice(0, 4)}...${s.validator.slice(-4)}` : s.validator}
                  </span>
                  <span className="text-[10px] text-[var(--tc-text-muted)] uppercase font-bold tracking-tight">
                    {s.status}
                  </span>
                </div>
                <span className="text-[12px] font-mono font-medium text-[var(--tc-text-primary)]">
                  {s.amount} SOL
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="relative" ref={dropdownRef}>
          <button
            className={`sw-swap-btn mt-2 w-full flex items-center justify-center gap-2 ${isDropdownOpen ? "bg-[var(--tc-bg-muted)]" : ""}`}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            {isDropdownOpen ? "Close List" : "Choose a Validator"}
            <svg
              viewBox="0 0 10 6"
              fill="none"
              width="10"
              height="6"
              className={`transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
            >
              <path
                d="M1 1l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {isDropdownOpen && (
            <div className="absolute left-0 right-0 bottom-[calc(100%+8px)] z-50 bg-[var(--tc-bg)] border border-[var(--tc-border)] rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div className="p-2 border-b border-[var(--tc-divider)] bg-[var(--tc-surface)]">
                <span className="text-[10px] font-bold text-[var(--tc-text-muted)] uppercase tracking-wider px-2">Top Validators</span>
              </div>
              <div className="max-h-[280px] overflow-y-auto">
                {topValidators.map((v) => (
                  <Link
                    key={v.votingPubkey}
                    href={`/validators/${v.votingPubkey}`}
                    className="flex items-center gap-3 p-3 hover:bg-[var(--tc-bg-hover)] transition-colors no-underline group"
                  >
                    {v.avatar ? (
                      <img src={v.avatar} alt={v.name} className="w-8 h-8 rounded-full border border-[var(--tc-border)]" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[var(--tc-bg-muted)] border border-[var(--tc-border)] flex items-center justify-center text-[10px] font-bold text-[var(--tc-text-primary)]">
                        {v.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[13px] font-semibold text-[var(--tc-text-primary)] truncate">{v.name}</span>
                      <span className="text-[10px] text-[var(--tc-accent-up)] font-medium">{v.apy.toFixed(2)}% APY</span>
                    </div>
                    <svg viewBox="0 0 16 16" fill="none" width="14" height="14" className="text-[var(--tc-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity">
                      <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                ))}
              </div>
              <Link
                href="/validators"
                className="flex items-center justify-center gap-2 p-3 bg-[var(--tc-surface)] border-t border-[var(--tc-divider)] text-[12px] font-bold text-[var(--tc-accent)] no-underline hover:bg-[var(--tc-bg-hover)] transition-colors"
                onClick={() => setIsDropdownOpen(false)}
              >
                Explore more
                <svg viewBox="0 0 16 16" fill="none" width="12" height="12">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="sw-powered">
        <span>Powered by Solana Native Staking</span>
      </div>
    </div>
  );
}
