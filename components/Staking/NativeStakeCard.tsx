"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useWallet, useBalance } from "@solana/connector";
import { useStakeTransaction, StakePosition } from "@/hooks/useStakeTransaction";
import { Validator } from "@/hooks/useValidators";
import { CaretDown, ArrowsLeftRight, ChartLineUp, Wallet, Lightning, Sparkle, ShieldCheck } from "@phosphor-icons/react";

export function NativeStakeCard() {
  const { isConnected, account } = useWallet();
  const { solBalance } = useBalance({ enabled: isConnected });
  const { fetchActiveStakes, executeStakeAction, status } = useStakeTransaction();
  
  const [activeTab, setActiveTab] = useState<"stake" | "positions">("stake");
  const [apy, setApy] = useState<number | null>(null);
  const [stakes, setStakes] = useState<StakePosition[]>([]);
  const [isLoadingStakes, setIsLoadingStakes] = useState(true);
  const [topValidators, setTopValidators] = useState<Validator[]>([]);
  const [selectedValidator, setSelectedValidator] = useState<Validator | null>(null);
  const [amount, setAmount] = useState("");
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
            const sorted = [...validators].sort((a, b) => b.stake - a.stake);
            setTopValidators(sorted.slice(0, 10));
            if (!selectedValidator) setSelectedValidator(sorted[0]);

            const top10 = sorted.slice(0, 10);
            const avgApy = top10.reduce((acc: number, v: Validator) => acc + (v.apy || 0), 0) / top10.length;
            setApy(avgApy);
          }
        }
      } catch (err) {
        console.error("Error fetching APY:", err);
      }
    }
    fetchData();
  }, [selectedValidator]);

  useEffect(() => {
    if (isConnected && account) {
      fetchActiveStakes(account)
        .then(setStakes)
        .finally(() => setIsLoadingStakes(false));
    } else {
      setIsLoadingStakes(false);
    }
  }, [isConnected, account, fetchActiveStakes]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMax = () => {
    if (solBalance) {
      const max = Math.max(0, solBalance - 0.01).toFixed(4);
      setAmount(max);
    }
  };

  const handleStake = async () => {
    if (!selectedValidator || !amount) return;
    const val = parseFloat(amount);
    if (val <= 0) return;

    await executeStakeAction("stake", {
      voteAccount: selectedValidator.votingPubkey,
      amountSOL: val,
    });
  };

  const isExecuting = ["loading", "signing", "sending", "confirming"].includes(status);

  return (
    <div className="sw-card !p-0 overflow-hidden !rounded-[28px] border-2 border-[var(--tc-border)] shadow-2xl bg-[var(--tc-bg)]/80 backdrop-blur-xl relative">
      {/* Decorative Glow */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-[var(--tc-accent)] opacity-[0.05] blur-[80px] pointer-events-none" />

      <div className="flex border-b border-[var(--tc-divider)] bg-[var(--tc-surface)]/30">
        <button 
          className={`flex-1 flex items-center justify-center gap-2 py-4 text-[13px] font-black uppercase tracking-widest transition-all ${activeTab === "stake" ? "text-[var(--tc-text-primary)] border-b-2 border-[var(--tc-accent)]" : "text-[var(--tc-text-muted)] hover:text-[var(--tc-text-primary)]"}`}
          onClick={() => setActiveTab("stake")}
        >
          <Lightning size={16} weight={activeTab === "stake" ? "fill" : "bold"} />
          Stake
        </button>
        <button 
          className={`flex-1 flex items-center justify-center gap-2 py-4 text-[13px] font-black uppercase tracking-widest transition-all ${activeTab === "positions" ? "text-[var(--tc-text-primary)] border-b-2 border-[var(--tc-accent)]" : "text-[var(--tc-text-muted)] hover:text-[var(--tc-text-primary)]"}`}
          onClick={() => setActiveTab("positions")}
        >
          <Wallet size={16} weight={activeTab === "positions" ? "fill" : "bold"} />
          Vaults
          {stakes.length > 0 && <span className="px-2 py-0.5 rounded-full bg-[var(--tc-accent)] text-white text-[9px] font-black">{stakes.length}</span>}
        </button>
      </div>

      {activeTab === "stake" ? (
        <div className="p-6 flex flex-col gap-6">
          {/* Validator Selection */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center px-1">
              <span className="text-[11px] font-black text-[var(--tc-text-muted)] uppercase tracking-widest">Select Node</span>
              <Link href="/validators" className="text-[10px] font-black text-[var(--tc-accent)] uppercase hover:underline">Explorer ↗</Link>
            </div>
            <div className="relative" ref={dropdownRef}>
              <button 
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[var(--tc-surface)]/50 border-2 border-transparent hover:border-[var(--tc-border-hover)] focus:border-[var(--tc-accent)] transition-all text-left shadow-inner"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                {selectedValidator?.avatar ? (
                  <img src={selectedValidator.avatar} alt="" className="w-10 h-10 rounded-xl border border-[var(--tc-border)] shadow-sm" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--tc-bg-muted)] to-[var(--tc-surface)] flex items-center justify-center text-[12px] font-black border border-[var(--tc-border)]">
                    {selectedValidator?.name.slice(0, 2).toUpperCase() || "??"}
                  </div>
                )}
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-[14px] font-black text-[var(--tc-text-primary)] truncate">{selectedValidator?.name || "Select Validator"}</span>
                  <span className="text-[11px] text-[var(--tc-accent-up)] font-bold flex items-center gap-1">
                    <Sparkle size={10} weight="fill" />
                    {selectedValidator?.apy.toFixed(2)}% APY
                  </span>
                </div>
                <CaretDown size={18} className={`text-[var(--tc-text-muted)] transition-transform duration-300 ${isDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {isDropdownOpen && (
                <div className="absolute top-[calc(100%+8px)] left-0 right-0 z-[60] bg-[var(--tc-bg)]/95 backdrop-blur-2xl border-2 border-[var(--tc-border)] rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="max-h-[300px] overflow-y-auto p-2">
                    {topValidators.map((v) => (
                      <button
                        key={v.votingPubkey}
                        className="w-full flex items-center gap-4 p-3 hover:bg-[var(--tc-accent)]/10 rounded-xl transition-all text-left group"
                        onClick={() => {
                          setSelectedValidator(v);
                          setIsDropdownOpen(false);
                        }}
                      >
                         {v.avatar ? (
                          <img src={v.avatar} alt="" className="w-9 h-9 rounded-lg border border-[var(--tc-border)]" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-[var(--tc-bg-muted)] flex items-center justify-center text-[10px] font-black">
                            {v.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-[13px] font-black text-[var(--tc-text-primary)] truncate group-hover:text-[var(--tc-accent)] transition-colors">{v.name}</span>
                          <span className="text-[11px] text-[var(--tc-text-muted)] font-bold">{v.apy.toFixed(2)}% APY</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Amount Input */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center px-1">
              <span className="text-[11px] font-black text-[var(--tc-text-muted)] uppercase tracking-widest">Stake Amount</span>
              {isConnected && (
                <button className="text-[10px] font-black text-[var(--tc-text-primary)] opacity-60 hover:opacity-100 uppercase" onClick={handleMax}>
                  BAL: {solBalance?.toFixed(3) || "0.00"} SOL
                </button>
              )}
            </div>
            <div className="group flex items-center gap-4 bg-[var(--tc-surface)]/50 p-5 rounded-[22px] border-2 border-transparent focus-within:border-[var(--tc-accent)] transition-all shadow-inner">
              <input 
                type="number"
                placeholder="0.00"
                className="bg-transparent outline-none flex-1 text-3xl font-black text-[var(--tc-text-primary)] min-w-0 placeholder:opacity-20"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--tc-bg)] border-2 border-[var(--tc-border)] shadow-sm">
                <div className="w-6 h-6 rounded-full bg-[#9945FF] p-1">
                  <img src="/solana-logo.png" alt="" className="w-full h-full object-contain brightness-0 invert" />
                </div>
                <span className="text-[14px] font-black text-[var(--tc-text-primary)]">SOL</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 mt-2">
            <div className="p-4 rounded-[22px] bg-[var(--tc-accent-up-bg)]/30 border border-[var(--tc-accent-up)]/10 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-[12px] font-bold text-[var(--tc-text-secondary)]">Network Rewards</span>
                <span className="text-[12px] font-black text-[var(--tc-accent-up)]">~{apy?.toFixed(2) || "7.4"}% APY</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[12px] font-bold text-[var(--tc-text-secondary)]">Activation</span>
                <span className="text-[12px] font-black text-[var(--tc-text-primary)]">Next Epoch</span>
              </div>
            </div>

            <button 
              className={`w-full h-16 rounded-[22px] bg-[var(--tc-accent)] text-white text-[16px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-[var(--tc-accent)]/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3 ${isExecuting ? "opacity-80" : ""}`}
              disabled={!isConnected || !amount || isExecuting}
              onClick={handleStake}
            >
              {isExecuting && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {isConnected ? (isExecuting ? "Signing..." : "Delegate Now") : "Connect Wallet"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col p-6 gap-4 min-h-[380px]">
          <span className="text-[11px] font-black text-[var(--tc-text-muted)] uppercase tracking-widest px-1">Active Positions</span>
          {isLoadingStakes ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 border-3 border-[var(--tc-accent)]/20 border-t-[var(--tc-accent)] rounded-full animate-spin" />
            </div>
          ) : stakes.length > 0 ? (
            <div className="flex flex-col gap-3">
              {stakes.map((s, i) => (
                <div key={i} className="group flex justify-between items-center p-4 rounded-2xl bg-[var(--tc-surface)]/50 border-2 border-transparent hover:border-[var(--tc-accent)]/30 transition-all shadow-sm">
                  <div className="flex flex-col">
                    <span className="text-[14px] font-black text-[var(--tc-text-primary)] font-mono">
                      {s.validator.length > 12 ? `${s.validator.slice(0, 6)}...${s.validator.slice(-4)}` : s.validator}
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${s.status === 'active' ? 'text-[var(--tc-accent-up)]' : 'text-[var(--tc-text-muted)]'}`}>
                      {s.status}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[15px] font-black text-[var(--tc-text-primary)]">{s.amount} <span className="text-[10px] opacity-60">SOL</span></span>
                    <Link href={`/validators/${s.address}`} className="text-[10px] font-black text-[var(--tc-accent)] hover:underline uppercase tracking-tighter mt-1">Manage ↗</Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30 gap-4">
              <div className="p-6 rounded-[30px] bg-[var(--tc-surface)]">
                <Wallet size={48} weight="thin" />
              </div>
              <p className="text-[14px] font-bold">No active delegations found</p>
            </div>
          )}
          
          <button 
            className="mt-auto w-full py-4 rounded-2xl border-2 border-[var(--tc-border)] text-[var(--tc-text-primary)] font-black uppercase tracking-widest text-[12px] hover:bg-[var(--tc-bg-hover)] transition-all"
            onClick={() => setActiveTab("stake")}
          >
            New Delegation
          </button>
        </div>
      )}

      <div className="py-3 px-6 bg-[var(--tc-surface)]/50 border-t border-[var(--tc-divider)] flex items-center justify-center gap-2">
        <ShieldCheck size={14} className="text-[var(--tc-accent-up)]" />
        <span className="text-[10px] font-black text-[var(--tc-text-muted)] uppercase tracking-widest">Secured by Solana Mainnet</span>
      </div>
    </div>
  );
}
