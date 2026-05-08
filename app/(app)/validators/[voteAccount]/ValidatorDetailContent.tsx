"use client";

import { useState, useEffect, useMemo } from "react";
import { Validator } from "@/hooks/useValidators";
import { useWallet, useBalance } from "@solana/connector";
import { useStakeTransaction, StakePosition } from "@/hooks/useStakeTransaction";
import { Sparkline } from "@/components/Sparkline";
import { 
  ChartLineUp, 
  TrendDown, 
  Info, 
  Globe, 
  MapPin, 
  Cpu, 
  CheckCircle,
  ClockCounterClockwise,
  ShieldCheck,
  Lightning,
  CaretDown
} from "@phosphor-icons/react";

interface ValidatorDetailContentProps {
  validator: Validator;
}

export function ValidatorDetailContent({ validator }: ValidatorDetailContentProps) {
  const { isConnected, account } = useWallet();
  const { solBalance } = useBalance({ enabled: isConnected });
  const { executeStakeAction, fetchActiveStakes, status, error: txError } = useStakeTransaction();

  const [amount, setAmount] = useState("");
  const [stakes, setStakes] = useState<StakePosition[]>([]);
  const [isLoadingStakes, setIsLoadingStakes] = useState(true);

  useEffect(() => {
    if (isConnected && account) {
      fetchActiveStakes(account).then(setStakes).finally(() => setIsLoadingStakes(false));
    } else {
      setIsLoadingStakes(false);
    }
  }, [isConnected, account, fetchActiveStakes]);

  const existingStake = useMemo(() => 
    stakes.find(s => s.validator === validator.name || s.validator === validator.votingPubkey),
  [stakes, validator]);

  const handleMax = () => {
    if (solBalance) {
      const max = Math.max(0, solBalance - 0.01).toFixed(4);
      setAmount(max);
    }
  };

  const handleStake = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    await executeStakeAction("stake", {
      voteAccount: validator.votingPubkey,
      amountSOL: val,
    });
  };

  const handleUnstake = async (stakeAccount: string) => {
    await executeStakeAction("deactivate", { stakeAccount });
  };

  const handleWithdraw = async (stakeAccount: string, amount: number) => {
    await executeStakeAction("withdraw", { stakeAccount, amountSOL: amount });
  };

  const estimatedDaily = useMemo(() => {
    const val = parseFloat(amount) || 0;
    return (val * (validator.apy / 100)) / 365;
  }, [amount, validator.apy]);

  const isExecuting = ["loading", "signing", "sending", "confirming"].includes(status);

  const stakeData = validator.stakeHistory?.map(h => h.value) || [];
  const skipRateData = validator.skipRateHistory?.map(h => h.value) || [];

  return (
    <div className="td-layout !max-w-[1400px]">
      {/* Left Column: Main Content */}
      <div className="td-main">
        {/* Header Section */}
        <header className="td-header">
          <div className="vs-logo-wrap relative group">
            {validator.avatar ? (
              <img src={validator.avatar} alt={validator.name} className="w-20 h-20 md:w-24 md:h-24 rounded-2xl border border-[var(--tc-border)] shadow-sm" />
            ) : (
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-[var(--tc-surface)] border border-[var(--tc-border)] flex items-center justify-center text-3xl font-bold text-[var(--tc-text-muted)]">
                {validator.name.slice(0, 2).toUpperCase()}
              </div>
            )}
            {validator.status === 'active' && (
              <div className="absolute -bottom-1 -right-1 bg-[var(--tc-accent-up)] text-white p-1 rounded-full shadow-lg border-2 border-[var(--tc-bg)]">
                <CheckCircle size={14} weight="fill" />
              </div>
            )}
          </div>

          <div className="td-header__info">
            <div className="td-header__row">
              <h1 className="td-header__name">{validator.name}</h1>
              {validator.isJito && (
                <div className="td-header__verified">
                  <span className="td-pill td-pill--sym !text-[#00FFBD] !bg-[#00FFBD]/10 border-[#00FFBD]/20">
                    <Lightning size={12} weight="fill" />
                    Jito MEV
                  </span>
                </div>
              )}
            </div>
            
            <div className="td-header__pills">
              <button 
                className="td-pill td-pill--mint group"
                onClick={() => navigator.clipboard.writeText(validator.votingPubkey)}
              >
                <span className="opacity-50">Vote:</span>
                {validator.votingPubkey.slice(0, 8)}...{validator.votingPubkey.slice(-8)}
                <svg viewBox="0 0 16 16" fill="none" width="12" height="12" className="opacity-40 group-hover:opacity-100 transition-opacity">
                  <path d="M4 4h8v8H4z" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M2 2h8v2H4v8H2z" fill="currentColor" opacity="0.3" />
                </svg>
              </button>
              {validator.website && (
                <a href={validator.website} target="_blank" rel="noopener noreferrer" className="td-pill hover:bg-[var(--tc-bg-hover)] transition-colors">
                  <Globe size={14} weight="bold" />
                  Website
                </a>
              )}
            </div>
          </div>

          <div className="td-header__actions hidden md:flex">
             <div className="flex flex-col items-end">
               <span className="text-[10px] text-[var(--tc-text-muted)] uppercase font-bold tracking-widest">Commission</span>
               <span className="text-2xl font-black text-[var(--tc-text-primary)]">{validator.commission}%</span>
             </div>
             <div className="w-[1px] h-10 bg-[var(--tc-divider)] mx-4" />
             <div className="flex flex-col items-end">
               <span className="text-[10px] text-[var(--tc-text-muted)] uppercase font-bold tracking-widest">Yield APY</span>
               <span className="text-2xl font-black text-[var(--tc-accent-up)]">{validator.apy.toFixed(2)}%</span>
             </div>
          </div>
        </header>

        {/* Charts Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="td-chart-section">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[11px] text-[var(--tc-text-muted)] uppercase font-black tracking-widest">Stake History</span>
              <span className="text-[14px] font-black text-[var(--tc-text-primary)]">{(validator.stake / 1e3).toFixed(1)}k SOL</span>
            </div>
            <div className="td-chart !h-[120px]">
               {stakeData.length > 1 ? (
                 <Sparkline data={stakeData} width={400} height={120} />
               ) : (
                 <div className="w-full h-full bg-[var(--tc-surface)]/50 border border-dashed border-[var(--tc-border)] rounded-xl flex items-center justify-center text-[11px] text-[var(--tc-text-muted)] italic">Awaiting stake data...</div>
               )}
            </div>
          </div>

          <div className="td-chart-section">
            <div className="flex justify-between items-center mb-4">
              <span className="text-[11px] text-[var(--tc-text-muted)] uppercase font-black tracking-widest">Performance</span>
              <span className="text-[14px] font-black text-[var(--tc-text-primary)]">{(100 - (validator.skipRate * 100)).toFixed(2)}% Score</span>
            </div>
            <div className="td-chart !h-[120px]">
               {skipRateData.length > 1 ? (
                 <Sparkline data={skipRateData} width={400} height={120} positive={false} />
               ) : (
                 <div className="w-full h-full bg-[var(--tc-surface)]/50 border border-dashed border-[var(--tc-border)] rounded-xl flex items-center justify-center text-[11px] text-[var(--tc-text-muted)] italic">Awaiting skip rate data...</div>
               )}
            </div>
          </div>
        </div>

        {/* Description Section */}
        <div className="td-card mb-8">
          <h3 className="text-lg font-black text-[var(--tc-text-primary)] mb-4 flex items-center gap-2">
            <Info size={20} className="text-[var(--tc-accent)]" />
            About Validator
          </h3>
          <p className="text-[15px] text-[var(--tc-text-secondary)] leading-relaxed font-medium">
            {validator.description || "This validator contributes to the security and decentralization of the Solana network by processing transactions and participating in consensus. They maintain high uptime and competitive APY for their delegators."}
          </p>
          
          <div className="mt-8 pt-8 border-t border-[var(--tc-divider)] grid grid-cols-1 sm:grid-cols-2 gap-8">
             <div className="flex flex-col gap-3">
               <h4 className="text-[11px] font-black text-[var(--tc-text-muted)] uppercase tracking-widest flex items-center gap-2">
                 <ClockCounterClockwise size={16} />
                 Epoch Credits
               </h4>
               <div className="flex flex-wrap gap-2">
                 {validator.epochCredits.length > 0 ? (
                   validator.epochCredits.slice(-5).reverse().map((credits, idx) => (
                     <div key={idx} className="bg-[var(--tc-surface)] border border-[var(--tc-border)] px-3 py-1.5 rounded-xl flex flex-col items-center">
                       <span className="text-[9px] text-[var(--tc-text-muted)] font-bold">E-{idx === 0 ? 'NOW' : idx}</span>
                       <span className="text-[12px] font-black font-mono text-[var(--tc-text-primary)]">{(credits / 1000).toFixed(0)}k</span>
                     </div>
                   ))
                 ) : (
                   <div className="text-[12px] text-[var(--tc-text-muted)] italic">Syncing...</div>
                 )}
               </div>
             </div>

             <div className="flex flex-col gap-3">
               <h4 className="text-[11px] font-black text-[var(--tc-text-muted)] uppercase tracking-widest flex items-center gap-2">
                 <ShieldCheck size={16} className="text-[var(--tc-accent-up)]" />
                 Network Position
               </h4>
               <p className="text-[13px] text-[var(--tc-text-secondary)] font-medium italic">
                 Ranked <span className="text-[var(--tc-text-primary)] font-black">#{validator.rank}</span> globally by stake weight. Contributing to network decentralization.
               </p>
             </div>
          </div>
        </div>

        {/* Technical Stats Grid */}
        <div className="td-stats-grid">
          <div className="td-stat-cell">
            <span className="td-stat__label">Version</span>
            <div className="td-stat__value">{validator.version || "1.18.x"}</div>
          </div>
          <div className="td-stat-cell">
            <span className="td-stat__label">Uptime</span>
            <div className="td-stat__value">{validator.uptime ? `${(validator.uptime * 100).toFixed(2)}%` : "99.99%"}</div>
          </div>
          <div className="td-stat-cell">
            <span className="td-stat__label">City</span>
            <div className="td-stat__value">{validator.city || "Unknown"}</div>
          </div>
          <div className="td-stat-cell">
            <span className="td-stat__label">Country</span>
            <div className="td-stat__value">{validator.country || "International"}</div>
          </div>
          <div className="td-stat-cell col-span-2">
            <span className="td-stat__label">Data Center</span>
            <div className="td-stat__value truncate">{validator.dataCenter || "Global Infrastructure"}</div>
          </div>
        </div>
      </div>

      {/* Right Column: Sidebar Action */}
      <div className="td-side">
        <div className="vs-stake-sidebar flex flex-col gap-6 sticky top-[80px]">
          {/* Main Stake Action Card - Mirrors AddLiquidityCard style */}
          <div className="sw-card !p-0">
             <div className="sw-tabs">
                <div className="sw-tab sw-tab--active">
                  <Lightning size={14} weight="fill" />
                  Native Staking
                </div>
             </div>
             
             <div className="p-5 flex flex-col gap-5">
                {existingStake ? (
                  <div className="flex flex-col gap-5">
                    <div className="bg-[var(--tc-surface)] rounded-2xl p-4 border border-[var(--tc-border)]">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-[var(--tc-text-muted)] uppercase font-black tracking-widest">Active Stake</span>
                        <span className="px-2 py-0.5 rounded-full bg-[var(--tc-accent-up-bg)] text-[var(--tc-accent-up)] text-[9px] font-black uppercase">{existingStake.status}</span>
                      </div>
                      <div className="text-[22px] font-black text-[var(--tc-text-primary)] font-mono">{existingStake.amount} SOL</div>
                    </div>

                    {existingStake.status === "active" ? (
                      <button
                        className="w-full py-4 rounded-xl border border-[var(--tc-accent-down)] text-[var(--tc-accent-down)] font-black hover:bg-[var(--tc-accent-down-bg)] transition-all text-[13px] uppercase tracking-widest"
                        onClick={() => handleUnstake(existingStake.address)}
                        disabled={isExecuting}
                      >
                        {isExecuting ? "Processing..." : "Unstake SOL"}
                      </button>
                    ) : (
                      <button
                        className="sw-swap-btn w-full !h-12 !text-[13px] !uppercase !tracking-widest"
                        onClick={() => handleWithdraw(existingStake.address, existingStake.amount)}
                        disabled={isExecuting}
                      >
                        {isExecuting ? "Processing..." : "Withdraw Funds"}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-black text-[var(--tc-text-muted)] uppercase tracking-widest">Amount</span>
                        <button className="text-[10px] font-black text-[var(--tc-accent)] uppercase" onClick={handleMax}>
                          MAX: {solBalance?.toFixed(3) ?? "0.00"}
                        </button>
                      </div>
                      <div className="flex items-center gap-3 bg-[var(--tc-surface)] p-3 rounded-xl border border-[var(--tc-border)] focus-within:border-[var(--tc-accent)] transition-all">
                        <input
                          type="number"
                          placeholder="0.00"
                          className="bg-transparent outline-none flex-1 text-xl font-black text-[var(--tc-text-primary)] min-w-0"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                        />
                        <span className="font-black text-[12px] text-[var(--tc-text-muted)]">SOL</span>
                      </div>
                    </div>

                    <div className="bg-[var(--tc-accent-up-bg)]/50 rounded-xl p-3 border border-[var(--tc-accent-up)]/10 flex flex-col gap-2">
                       <div className="flex justify-between items-center text-[11px]">
                         <span className="text-[var(--tc-text-secondary)] font-bold">Estimated Earnings</span>
                         <span className="font-black text-[var(--tc-accent-up)]">+{estimatedDaily.toFixed(4)} SOL/day</span>
                       </div>
                    </div>

                    <button
                      className={`sw-swap-btn w-full !h-12 !text-[14px] !font-black !uppercase !tracking-widest ${isExecuting ? "sw-swap-btn--busy" : ""}`}
                      disabled={!isConnected || isExecuting || !amount}
                      onClick={handleStake}
                    >
                      {isExecuting && <span className="sw-spinner mr-2" />}
                      {isConnected ? (isExecuting ? "Signing..." : "Stake SOL") : "Connect Wallet"}
                    </button>
                  </div>
                )}

                <div className="sw-powered !mt-0 !pt-0">
                  <span>Secured by Solana Native Staking</span>
                </div>
             </div>
          </div>

          {/* Quick Stats Panel */}
          <div className="td-card !p-4">
            <h4 className="text-[11px] font-black text-[var(--tc-text-primary)] uppercase tracking-widest mb-4">Node Metrics</h4>
            <div className="flex flex-col gap-3">
              <SidebarStat label="APY" value={`${validator.apy.toFixed(2)}%`} color="var(--tc-accent-up)" />
              <SidebarStat label="Commission" value={`${validator.commission}%`} />
              <SidebarStat label="Rank" value={`#${validator.rank}`} />
              <SidebarStat label="Uptime" value={validator.uptime ? `${(validator.uptime * 100).toFixed(1)}%` : "99.9%"} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[12px] text-[var(--tc-text-muted)] font-medium">{label}</span>
      <span className="text-[12px] font-black font-mono" style={{ color: color || "var(--tc-text-primary)" }}>{value}</span>
    </div>
  );
}
