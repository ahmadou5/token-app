"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useWallet, useBalance } from "@solana/connector";
import { useStakeTransaction, StakePosition } from "@/hooks/useStakeTransaction";
import { Validator } from "@/hooks/useValidators";
import { CaretDown, ArrowsLeftRight, ChartLineUp, Wallet, Lightning, Sparkle, ShieldCheck, Check } from "@phosphor-icons/react";

export function NativeStakeCard() {
  const { isConnected, account } = useWallet();
  const { solBalance } = useBalance({ enabled: isConnected });
  const { fetchActiveStakes, executeStakeAction, status } = useStakeTransaction();
  
  const [activeTab, setActiveTab] = useState<"stake" | "vaults">("stake");
  const [stakes, setStakes] = useState<StakePosition[]>([]);
  const [isLoadingStakes, setIsLoadingStakes] = useState(true);
  const [topValidators, setTopValidators] = useState<Validator[]>([]);
  const [selectedValidator, setSelectedValidator] = useState<Validator | null>(null);
  const [amount, setAmount] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/getValidators");
        if (res.ok) {
          const data = await res.json();
          const validatorsList = Array.isArray(data) ? data : (data.validators || []);
          if (validatorsList.length > 0) {
            setTopValidators(validatorsList.slice(0, 20));
            if (!selectedValidator) setSelectedValidator(validatorsList[0]);
          }
        }
      } catch (err) {
        console.error("Error fetching validators:", err);
      }
    }
    fetchData();
  }, []);

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

  const filteredValidators = useMemo(() => 
    topValidators.filter(v => v.name.toLowerCase().includes(search.toLowerCase())),
  [topValidators, search]);

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
          <Lightning size={14} weight={activeTab === "stake" ? "fill" : "bold"} />
          Stake
        </button>
        <button 
          className={`sw-tab ${activeTab === "vaults" ? "sw-tab--active" : ""}`}
          onClick={() => setActiveTab("vaults")}
        >
          <ShieldCheck size={14} weight={activeTab === "vaults" ? "fill" : "bold"} />
          Vaults
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {activeTab === "stake" ? (
          <>
            {/* Validator Selection */}
            <div className="relative" ref={dropdownRef}>
              <div className="flex justify-between items-center px-1 mb-1.5">
                <span className="text-[10px] font-black text-[var(--tc-text-muted)] uppercase tracking-widest">Select Node</span>
              </div>
              <button 
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[var(--tc-surface)] border border-[var(--tc-border)] hover:border-[var(--tc-accent)] transition-all"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                {selectedValidator ? (
                  <div className="flex items-center gap-3">
                    <img src={selectedValidator.avatar} className="w-6 h-6 rounded-lg" alt="" />
                    <div className="flex flex-col items-start">
                      <span className="text-[13px] font-black text-[var(--tc-text-primary)]">{selectedValidator.name}</span>
                      <span className="text-[10px] text-[var(--tc-accent-up)] font-bold">{selectedValidator.apy.toFixed(2)}% APY</span>
                    </div>
                  </div>
                ) : (
                  <span className="text-[13px] text-[var(--tc-text-muted)]">Select a validator...</span>
                )}
                <CaretDown size={14} className={`transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {isDropdownOpen && (
                <div className="absolute top-[calc(100%+8px)] left-0 right-0 z-50 bg-[var(--tc-bg)] border border-[var(--tc-border)] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                  <div className="p-2 border-b border-[var(--tc-divider)]">
                    <input 
                      type="text" 
                      placeholder="Search nodes..." 
                      className="w-full h-9 px-3 bg-[var(--tc-surface)] rounded-lg text-[12px] font-bold outline-none border border-transparent focus:border-[var(--tc-accent)] transition-all"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="max-h-[240px] overflow-y-auto">
                    {filteredValidators.map(v => (
                      <button 
                        key={v.votingPubkey}
                        className="w-full flex items-center justify-between p-3 hover:bg-[var(--tc-bg-hover)] transition-colors group"
                        onClick={() => {
                          setSelectedValidator(v);
                          setIsDropdownOpen(false);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <img src={v.avatar} className="w-8 h-8 rounded-lg border border-[var(--tc-border)]" alt="" />
                          <div className="flex flex-col items-start">
                            <span className="text-[13px] font-black text-[var(--tc-text-primary)]">{v.name}</span>
                            <span className="text-[10px] text-[var(--tc-text-muted)]">Rank #{v.rank}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[12px] font-black text-[var(--tc-accent-up)]">{v.apy.toFixed(2)}%</span>
                          {selectedValidator?.votingPubkey === v.votingPubkey && <Check size={12} className="text-[var(--tc-accent)]" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Amount Field */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-black text-[var(--tc-text-muted)] uppercase tracking-widest">Amount to Stake</span>
                <button className="text-[10px] font-black text-[var(--tc-accent)] uppercase" onClick={handleMax}>
                  MAX: {solBalance?.toFixed(3) ?? "0.00"}
                </button>
              </div>
              <div className="flex items-center gap-3 bg-[var(--tc-surface)] p-4 rounded-2xl border border-[var(--tc-border)] focus-within:border-[var(--tc-accent)] transition-all">
                <input 
                  type="number"
                  placeholder="0.00"
                  className="bg-transparent outline-none flex-1 text-2xl font-black text-[var(--tc-text-primary)] min-w-0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--tc-bg)] border border-[var(--tc-border)]">
                   <div className="w-5 h-5 rounded-full bg-[#9945FF] p-0.5">
                     <img src="/solana-logo.png" alt="" className="w-full h-full object-contain brightness-0 invert" />
                   </div>
                   <span className="font-black text-[12px] text-[var(--tc-text-primary)]">SOL</span>
                </div>
              </div>
            </div>

            <button 
              className={`sw-swap-btn w-full !h-14 !text-[15px] !font-black !uppercase !tracking-widest ${isExecuting ? "sw-swap-btn--busy" : ""}`}
              disabled={!isConnected || isExecuting || !amount}
              onClick={handleStake}
            >
              {isExecuting && <span className="sw-spinner mr-2" />}
              {isConnected ? (isExecuting ? "Signing..." : "Delegate Now") : "Connect Wallet"}
            </button>
          </>
        ) : (
          <div className="flex flex-col gap-4 py-8 items-center text-center px-4 bg-[var(--tc-surface)] rounded-2xl border border-dashed border-[var(--tc-border)]">
             <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[var(--tc-accent)] to-[var(--tc-accent-up)] flex items-center justify-center text-white shadow-lg">
                <Sparkle size={24} weight="fill" />
             </div>
             <div className="flex flex-col gap-1">
                <h4 className="text-[15px] font-black text-[var(--tc-text-primary)]">Liquid Staking</h4>
                <p className="text-[12px] text-[var(--tc-text-muted)] leading-relaxed">
                  Earn staking yield while keeping your liquidity with LSTs like jitoSOL or mSOL.
                </p>
             </div>
             <button className="px-6 py-2 rounded-xl bg-[var(--tc-bg)] border border-[var(--tc-accent)] text-[var(--tc-accent)] text-[11px] font-black uppercase tracking-widest hover:bg-[var(--tc-accent)] hover:text-white transition-all">
                Explore LSTs
             </button>
          </div>
        )}

        <div className="sw-powered">
           <span>Secured by Solana Mainnet</span>
        </div>
      </div>
    </div>
  );
}
