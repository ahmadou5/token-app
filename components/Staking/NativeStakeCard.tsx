"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useWallet, useBalance } from "@solana/connector";
import { useStakeTransaction, StakePosition } from "@/hooks/useStakeTransaction";
import { Validator } from "@/hooks/useValidators";
import { CaretDown, ArrowsLeftRight, ChartLineUp, Wallet } from "@phosphor-icons/react";

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
    <div className="sw-card">
      <div className="sw-tabs">
        <button 
          className={`sw-tab ${activeTab === "stake" ? "sw-tab--active" : ""}`}
          onClick={() => setActiveTab("stake")}
        >
          <ChartLineUp size={14} weight="bold" />
          Stake
        </button>
        <button 
          className={`sw-tab ${activeTab === "positions" ? "sw-tab--active" : ""}`}
          onClick={() => setActiveTab("positions")}
        >
          <Wallet size={14} weight="bold" />
          Positions
          {stakes.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-[var(--tc-accent-bg)] text-[var(--tc-accent)] text-[9px]">{stakes.length}</span>}
        </button>
      </div>

      {activeTab === "stake" ? (
        <div className="flex flex-col">
          {/* Validator Selection */}
          <div className="sw-input-group !pb-2">
            <div className="sw-input-hdr">
              <span className="sw-input-lbl">Validator</span>
              <Link href="/validators" className="text-[10px] text-[var(--tc-accent)] hover:underline">View All</Link>
            </div>
            <div className="relative" ref={dropdownRef}>
              <button 
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-[var(--tc-surface)] border border-[var(--tc-border)] hover:border-[var(--tc-border-hover)] transition-all text-left"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                {selectedValidator?.avatar ? (
                  <img src={selectedValidator.avatar} alt="" className="w-8 h-8 rounded-full border border-[var(--tc-border)]" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[var(--tc-bg-muted)] flex items-center justify-center text-[10px] font-bold">
                    {selectedValidator?.name.slice(0, 2).toUpperCase() || "??"}
                  </div>
                )}
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-[13px] font-bold text-[var(--tc-text-primary)] truncate">{selectedValidator?.name || "Select Validator"}</span>
                  <span className="text-[11px] text-[var(--tc-accent-up)] font-medium">{selectedValidator?.apy.toFixed(2)}% APY</span>
                </div>
                <CaretDown size={16} className={`text-[var(--tc-text-muted)] transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {isDropdownOpen && (
                <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 bg-[var(--tc-bg)] border border-[var(--tc-border)] rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="max-h-[240px] overflow-y-auto p-1">
                    {topValidators.map((v) => (
                      <button
                        key={v.votingPubkey}
                        className="w-full flex items-center gap-3 p-2 hover:bg-[var(--tc-bg-hover)] rounded-lg transition-colors text-left group"
                        onClick={() => {
                          setSelectedValidator(v);
                          setIsDropdownOpen(false);
                        }}
                      >
                         {v.avatar ? (
                          <img src={v.avatar} alt="" className="w-7 h-7 rounded-full border border-[var(--tc-border)]" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-[var(--tc-bg-muted)] flex items-center justify-center text-[9px] font-bold">
                            {v.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="text-[12px] font-semibold text-[var(--tc-text-primary)] truncate">{v.name}</span>
                          <span className="text-[10px] text-[var(--tc-text-muted)]">{v.apy.toFixed(2)}% APY</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-center -my-2 z-10">
             <div className="p-1 bg-[var(--tc-bg)] rounded-full border border-[var(--tc-border)]">
               <div className="p-1.5 bg-[var(--tc-surface)] rounded-full text-[var(--tc-text-muted)]">
                 <ArrowsLeftRight size={14} weight="bold" className="rotate-90" />
               </div>
             </div>
          </div>

          {/* Amount Input */}
          <div className="sw-output-group !bg-transparent !border-t-0">
            <div className="sw-input-hdr">
              <span className="sw-input-lbl">Amount to Stake</span>
              {isConnected && (
                <button className="sw-bal-btn" onClick={handleMax}>
                  Bal: {solBalance?.toFixed(4) || "0.00"} SOL
                </button>
              )}
            </div>
            <div className="sw-input-row">
              <input 
                type="number"
                placeholder="0.00"
                className="sw-amount !text-2xl"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--tc-surface)] border border-[var(--tc-border)]">
                <div className="w-4 h-4 rounded-full bg-[#9945FF] flex items-center justify-center overflow-hidden">
                  <img src="/solana-logo.png" alt="" className="w-full h-full object-cover" />
                </div>
                <span className="text-[12px] font-bold text-[var(--tc-text-primary)]">SOL</span>
              </div>
            </div>
          </div>

          <div className="px-4 pb-4">
            <div className="p-3 rounded-xl bg-[var(--tc-surface)] border border-[var(--tc-border)] flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-[var(--tc-text-muted)]">Network APY</span>
                <span className="text-[11px] font-bold text-[var(--tc-accent-up)]">{apy?.toFixed(2) || "7.4"}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-[var(--tc-text-muted)]">Lock-up Period</span>
                <span className="text-[11px] font-semibold text-[var(--tc-text-primary)]">~2-3 Days</span>
              </div>
            </div>

            <button 
              className={`sw-swap-btn mt-4 w-full ${isExecuting ? "sw-swap-btn--busy" : ""}`}
              disabled={!isConnected || !amount || isExecuting}
              onClick={handleStake}
            >
              {isExecuting && <span className="sw-spinner" />}
              {isConnected ? (isExecuting ? "Processing..." : "Stake SOL") : "Connect Wallet"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col p-4 gap-3 min-h-[300px]">
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-[var(--tc-text-muted)] uppercase tracking-wider">Active Stakes</span>
            {isLoadingStakes ? (
              <div className="py-12 flex items-center justify-center">
                <span className="sw-spinner" />
              </div>
            ) : stakes.length > 0 ? (
              <div className="flex flex-col gap-2">
                {stakes.map((s, i) => (
                  <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-[var(--tc-surface)] border border-[var(--tc-border)] hover:border-[var(--tc-border-hover)] transition-all">
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-[var(--tc-text-primary)] font-mono">
                        {s.validator.length > 12 ? `${s.validator.slice(0, 6)}...${s.validator.slice(-4)}` : s.validator}
                      </span>
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${s.status === 'active' ? 'text-[var(--tc-accent-up)]' : 'text-[var(--tc-text-muted)]'}`}>
                        {s.status}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[13px] font-bold text-[var(--tc-text-primary)]">{s.amount} SOL</span>
                      <Link href={`/validators/${s.address}`} className="text-[9px] text-[var(--tc-accent)] hover:underline">Details ↗</Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center opacity-40">
                <Wallet size={40} weight="thin" />
                <p className="text-[13px] mt-2">No active stakes found</p>
              </div>
            )}
          </div>
          
          <button 
            className="mt-auto sw-swap-btn !bg-transparent !border-[var(--tc-border)] !text-[var(--tc-text-primary)] hover:!bg-[var(--tc-bg-hover)]"
            onClick={() => setActiveTab("stake")}
          >
            Stake More SOL
          </button>
        </div>
      )}

      <div className="sw-powered">
        <span>Powered by Solana Native Staking</span>
      </div>
    </div>
  );
}
