"use client";

import { useState, useEffect, useMemo } from "react";
import { Validator } from "@/hooks/useValidators";
import { useWallet, useBalance } from "@solana/connector";
import { useStakeTransaction, StakePosition } from "@/hooks/useStakeTransaction";
import { Sparkline } from "@/components/Sparkline";
import { 
  ChartLineUp, 
  TrendUp, 
  TrendDown, 
  Info, 
  Globe, 
  MapPin, 
  Cpu, 
  CheckCircle,
  ClockCounterClockwise,
  ArrowUpRight,
  ShieldCheck,
  Lightning
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
    <div className="vs-content flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Info - Premium Hero Section */}
      <div className="relative overflow-hidden vs-card bg-[var(--tc-bg)] border border-[var(--tc-border)] rounded-[24px] p-8 md:p-10 flex flex-col md:flex-row gap-8 items-start md:items-center shadow-2xl">
        {/* Background Glow */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-[var(--tc-accent)] opacity-[0.03] blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-[var(--tc-accent-up)] opacity-[0.03] blur-[100px] pointer-events-none" />

        <div className="relative vs-logo-wrap flex-shrink-0 group">
          {validator.avatar ? (
            <img src={validator.avatar} alt={validator.name} className="w-28 h-28 md:w-32 md:h-32 rounded-[22px] border border-[var(--tc-border)] shadow-2xl transition-transform duration-500 group-hover:scale-105" />
          ) : (
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-[22px] bg-gradient-to-br from-[var(--tc-surface)] to-[var(--tc-bg-muted)] border border-[var(--tc-border)] flex items-center justify-center text-4xl font-bold text-[var(--tc-text-muted)] shadow-xl">
              {validator.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          {validator.status === 'active' && (
            <div className="absolute -bottom-2 -right-2 bg-[var(--tc-accent-up)] text-white p-1.5 rounded-full shadow-lg border-2 border-[var(--tc-bg)]">
              <CheckCircle size={16} weight="fill" />
            </div>
          )}
        </div>

        <div className="vs-info flex flex-col flex-1 gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-3xl md:text-4xl font-black text-[var(--tc-text-primary)] tracking-tight leading-none">{validator.name}</h2>
            <div className="flex gap-2">
              {validator.isJito && (
                <span className="px-3 py-1 rounded-full bg-[#00FFBD]/10 text-[#00FFBD] text-[11px] font-extrabold uppercase tracking-widest border border-[#00FFBD]/20 flex items-center gap-2">
                  <Lightning size={12} weight="fill" />
                  Jito MEV
                </span>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-[var(--tc-text-secondary)] font-mono text-[13px] bg-[var(--tc-surface)]/50 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-[var(--tc-border)] group cursor-pointer hover:border-[var(--tc-accent)] transition-all" onClick={() => navigator.clipboard.writeText(validator.votingPubkey)}>
              <span className="opacity-50 font-sans font-bold">ADDRESS</span>
              <span className="max-w-[120px] md:max-w-none truncate">{validator.votingPubkey}</span>
              <svg viewBox="0 0 16 16" fill="none" width="14" height="14" className="opacity-40 group-hover:opacity-100 transition-opacity">
                <path d="M4 4h8v8H4z" stroke="currentColor" strokeWidth="1.5" />
                <path d="M2 2h8v2H4v8H2z" fill="currentColor" opacity="0.3" />
              </svg>
            </div>
            
            <div className="flex gap-4">
              {validator.website && (
                <a href={validator.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[13px] font-bold text-[var(--tc-text-primary)] hover:text-[var(--tc-accent)] transition-colors">
                  <Globe size={18} weight="duotone" />
                  <span className="border-b border-transparent hover:border-[var(--tc-accent)]">Website</span>
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="vs-metrics flex md:flex-col gap-10 md:border-l border-[var(--tc-divider)] md:pl-10 mt-6 md:mt-0 w-full md:w-auto">
          <div className="flex flex-col flex-1 md:flex-none">
            <span className="text-[11px] text-[var(--tc-text-muted)] uppercase font-black tracking-[0.2em] mb-2">Commission</span>
            <div className="flex items-baseline gap-1">
              <span className="text-[32px] font-black text-[var(--tc-text-primary)] leading-none">{validator.commission}%</span>
            </div>
          </div>
          <div className="flex flex-col flex-1 md:flex-none">
            <span className="text-[11px] text-[var(--tc-text-muted)] uppercase font-black tracking-[0.2em] mb-2">Yield APY</span>
            <div className="flex items-baseline gap-1">
              <span className="text-[32px] font-black text-[var(--tc-accent-up)] leading-none">{validator.apy.toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Data & Action */}
      <div className="vs-details-grid grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Data & About */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          
          {/* Historical Insights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="group vs-card bg-gradient-to-b from-[var(--tc-bg)] to-[var(--tc-surface)] border border-[var(--tc-border)] rounded-[24px] p-6 hover:border-[var(--tc-accent-up)]/30 transition-all duration-500 shadow-lg">
              <div className="flex justify-between items-start mb-6">
                <div className="flex flex-col">
                  <span className="text-[11px] text-[var(--tc-text-muted)] uppercase font-black tracking-widest mb-1">Network Weight</span>
                  <span className="text-[20px] font-black text-[var(--tc-text-primary)]">{(validator.stake / 1e3).toFixed(1)}k <span className="text-[13px] text-[var(--tc-text-muted)] font-bold">SOL</span></span>
                </div>
                <div className="p-3 rounded-2xl bg-[var(--tc-accent-up-bg)] text-[var(--tc-accent-up)] group-hover:scale-110 transition-transform">
                  <ChartLineUp size={22} weight="duotone" />
                </div>
              </div>
              <div className="h-20 w-full">
                 {stakeData.length > 1 ? (
                   <Sparkline data={stakeData} width={400} height={80} />
                 ) : (
                   <div className="h-full w-full bg-[var(--tc-surface)]/50 rounded-xl border border-dashed border-[var(--tc-border)] flex items-center justify-center text-[11px] text-[var(--tc-text-muted)] font-bold">Awaiting historical data...</div>
                 )}
              </div>
            </div>

            <div className="group vs-card bg-gradient-to-b from-[var(--tc-bg)] to-[var(--tc-surface)] border border-[var(--tc-border)] rounded-[24px] p-6 hover:border-[var(--tc-accent-down)]/30 transition-all duration-500 shadow-lg">
              <div className="flex justify-between items-start mb-6">
                <div className="flex flex-col">
                  <span className="text-[11px] text-[var(--tc-text-muted)] uppercase font-black tracking-widest mb-1">Efficiency</span>
                  <span className="text-[20px] font-black text-[var(--tc-text-primary)]">{(100 - (validator.skipRate * 100)).toFixed(2)}% <span className="text-[13px] text-[var(--tc-text-muted)] font-bold">Score</span></span>
                </div>
                <div className={`p-3 rounded-2xl ${validator.skipRate < 0.05 ? 'bg-[var(--tc-accent-up-bg)] text-[var(--tc-accent-up)]' : 'bg-[var(--tc-accent-down-bg)] text-[var(--tc-accent-down)]'} group-hover:scale-110 transition-transform`}>
                  <TrendDown size={22} weight="duotone" />
                </div>
              </div>
              <div className="h-20 w-full">
                 {skipRateData.length > 1 ? (
                   <Sparkline data={skipRateData} width={400} height={80} positive={false} />
                 ) : (
                   <div className="h-full w-full bg-[var(--tc-surface)]/50 rounded-xl border border-dashed border-[var(--tc-border)] flex items-center justify-center text-[11px] text-[var(--tc-text-muted)] font-bold">Awaiting performance data...</div>
                 )}
              </div>
            </div>
          </div>

          {/* About Section - Liquid Glass Effect */}
          <div className="relative vs-about-card bg-[var(--tc-bg)]/80 backdrop-blur-xl border border-[var(--tc-border)] rounded-[28px] p-8 md:p-10 shadow-2xl">
            <h3 className="text-2xl font-black text-[var(--tc-text-primary)] mb-8 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[var(--tc-accent-bg)] text-[var(--tc-accent)]">
                <Info size={24} weight="duotone" />
              </div>
              About Validator
            </h3>
            <p className="text-[16px] text-[var(--tc-text-secondary)] leading-[1.8] font-medium">
              {validator.description || "This validator contributes to the security and decentralization of the Solana network by processing transactions and participating in consensus. They maintain high uptime and competitive APY for their delegators."}
            </p>
            
            <div className="mt-12 pt-10 border-t border-[var(--tc-divider)] grid grid-cols-1 sm:grid-cols-2 gap-10">
               <div className="flex flex-col gap-4">
                 <h4 className="text-[12px] font-black text-[var(--tc-text-primary)] uppercase tracking-[0.15em] flex items-center gap-2">
                   <ClockCounterClockwise size={18} className="text-[var(--tc-accent)]" />
                   Recent Epochs
                 </h4>
                 <div className="flex flex-wrap gap-2.5">
                   {validator.epochCredits.length > 0 ? (
                     validator.epochCredits.slice(-5).reverse().map((credits, idx) => (
                       <div key={idx} className="bg-[var(--tc-surface)]/80 border border-[var(--tc-border)] px-4 py-2 rounded-2xl flex flex-col items-center hover:scale-105 transition-transform duration-300">
                         <span className="text-[10px] text-[var(--tc-text-muted)] font-bold mb-0.5">E-{idx === 0 ? 'NOW' : idx}</span>
                         <span className="text-[14px] font-black font-mono text-[var(--tc-text-primary)]">{(credits / 1000).toFixed(0)}k</span>
                       </div>
                     ))
                   ) : (
                     <div className="text-[13px] font-medium text-[var(--tc-text-muted)] italic">Credits sync in progress...</div>
                   )}
                 </div>
               </div>

               <div className="flex flex-col gap-4">
                 <h4 className="text-[12px] font-black text-[var(--tc-text-primary)] uppercase tracking-[0.15em] flex items-center gap-2">
                   <ShieldCheck size={18} className="text-[var(--tc-accent-up)]" />
                   Security Tier
                 </h4>
                 <div className="p-4 rounded-2xl bg-[var(--tc-accent-up-bg)]/50 border border-[var(--tc-accent-up)]/10">
                   <p className="text-[13px] text-[var(--tc-text-secondary)] font-semibold leading-relaxed">
                     Verified decentralized node in the Solana Mainnet cluster. 
                     Ranked <span className="text-[var(--tc-text-primary)] font-black">#{validator.rank}</span> globally by stake weight.
                   </p>
                 </div>
               </div>
            </div>
          </div>
        </div>

        {/* Right Column: Technical Sidebar & Actions */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          
          {/* Action Card - The Main Focus */}
          <div className="vs-stake-card bg-gradient-to-br from-[var(--tc-bg)] to-[var(--tc-surface)] border-2 border-[var(--tc-accent)]/20 rounded-[30px] p-8 shadow-2xl relative overflow-hidden">
             {/* Decorative Element */}
             <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--tc-accent)]/5 rounded-full blur-3xl -mr-16 -mt-16" />
             
             <h3 className="text-2xl font-black text-[var(--tc-text-primary)] mb-8 flex items-center justify-between">
              Staking SOL
              {existingStake && (
                <span className="px-3 py-1 rounded-full bg-[var(--tc-accent-up-bg)] text-[var(--tc-accent-up)] text-[11px] font-black uppercase tracking-widest border border-[var(--tc-accent-up)]/20">
                  {existingStake.status}
                </span>
              )}
            </h3>

            {existingStake ? (
               <div className="flex flex-col gap-6">
                 <div className="bg-[var(--tc-surface)]/80 backdrop-blur-sm rounded-2xl p-5 border border-[var(--tc-border)]">
                   <span className="text-[11px] text-[var(--tc-text-muted)] uppercase font-black tracking-widest mb-1 block">Active Position</span>
                   <div className="text-[28px] font-black text-[var(--tc-text-primary)] font-mono">{existingStake.amount} <span className="text-sm">SOL</span></div>
                 </div>

                 {existingStake.status === "active" ? (
                   <button
                     className="w-full py-4 rounded-2xl border-2 border-[var(--tc-accent-down)] text-[var(--tc-accent-down)] font-black hover:bg-[var(--tc-accent-down)] hover:text-white transition-all text-[15px] uppercase tracking-widest"
                     onClick={() => handleUnstake(existingStake.address)}
                     disabled={isExecuting}
                   >
                     {isExecuting ? "Processing..." : "Unstake SOL"}
                   </button>
                 ) : (
                   <button
                     className="w-full py-4 rounded-2xl bg-[var(--tc-accent-up)] text-white font-black hover:opacity-90 hover:scale-[0.98] transition-all text-[15px] shadow-lg shadow-[var(--tc-accent-up)]/20 uppercase tracking-widest"
                     onClick={() => handleWithdraw(existingStake.address, existingStake.amount)}
                     disabled={isExecuting}
                   >
                     {isExecuting ? "Processing..." : "Withdraw Funds"}
                   </button>
                 )}
               </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="sw-perp-form__field">
                  <div className="sw-perp-form__field-hdr">
                    <span className="text-[11px] text-[var(--tc-text-muted)] uppercase font-black tracking-widest">Amount</span>
                    <button className="sw-bal-btn font-black" onClick={handleMax}>
                      MAX: {solBalance?.toFixed(3) ?? "0.00"}
                    </button>
                  </div>
                  <div className="group flex items-center gap-3 bg-[var(--tc-surface)]/80 backdrop-blur-sm p-4 rounded-2xl border-2 border-transparent focus-within:border-[var(--tc-accent)] transition-all">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="bg-transparent outline-none flex-1 text-2xl font-black text-[var(--tc-text-primary)] min-w-0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--tc-bg)] border border-[var(--tc-border)]">
                       <div className="w-5 h-5 rounded-full bg-[#9945FF] p-0.5">
                         <img src="/solana-logo.png" alt="" className="w-full h-full object-contain brightness-0 invert" />
                       </div>
                       <span className="font-black text-[13px] text-[var(--tc-text-primary)]">SOL</span>
                    </div>
                  </div>
                </div>

                <div className="bg-[var(--tc-accent-up-bg)]/50 rounded-2xl p-5 border border-[var(--tc-accent-up)]/10 flex flex-col gap-3">
                   <div className="flex justify-between items-center">
                     <span className="text-[12px] text-[var(--tc-text-secondary)] font-bold">Estimated Rewards</span>
                     <span className="text-[12px] font-black text-[var(--tc-accent-up)]">+{estimatedDaily.toFixed(4)} SOL/day</span>
                   </div>
                   <div className="h-1.5 w-full bg-[var(--tc-accent-up-bg)] rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--tc-accent-up)] animate-pulse" style={{width: '65%'}} />
                   </div>
                </div>

                <button
                  className={`sw-swap-btn w-full !h-16 !text-[16px] !font-black !rounded-2xl !uppercase !tracking-[0.15em] shadow-2xl shadow-[var(--tc-accent)]/25 ${isExecuting ? "sw-swap-btn--busy" : ""}`}
                  disabled={!isConnected || isExecuting || !amount}
                  onClick={handleStake}
                >
                  {isExecuting && <span className="sw-spinner mr-3" />}
                  {isConnected ? (isExecuting ? "Signing..." : "Delegate Now") : "Connect Wallet"}
                </button>
              </div>
            )}
          </div>

          {/* Technical Specs Card */}
          <div className="vs-tech-card bg-[var(--tc-bg)]/60 border border-[var(--tc-border)] rounded-[28px] p-8 shadow-sm">
            <h3 className="text-lg font-black text-[var(--tc-text-primary)] mb-6 flex items-center gap-2">
              <Cpu size={24} weight="duotone" className="text-[var(--tc-text-muted)]" />
              Technical Specs
            </h3>
            <div className="flex flex-col gap-2">
              <TechStat icon={<ChartLineUp size={18} weight="duotone" />} label="Network Rank" value={`#${validator.rank}`} />
              <TechStat icon={<Cpu size={18} weight="duotone" />} label="Version" value={validator.version || "1.18.x"} />
              <TechStat icon={<ClockCounterClockwise size={18} weight="duotone" />} label="Uptime" value={validator.uptime ? `${(validator.uptime * 100).toFixed(2)}%` : "99.99%"} />
              <TechStat icon={<MapPin size={18} weight="duotone" />} label="Location" value={`${validator.city || "Unknown"}, ${validator.country || "Intl"}`} />
              <TechStat icon={<Globe size={18} weight="duotone" />} label="Data Center" value={validator.dataCenter.length > 15 ? validator.dataCenter.slice(0, 15) + '...' : validator.dataCenter} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TechStat({ icon, label, value }: { icon: React.ReactNode, label: string; value: string | number }) {
  return (
    <div className="group flex justify-between items-center py-3.5 border-b border-[var(--tc-divider)] last:border-0 hover:bg-[var(--tc-surface)]/50 px-2 -mx-2 rounded-xl transition-colors">
      <div className="flex items-center gap-3">
        <span className="text-[var(--tc-text-muted)] group-hover:text-[var(--tc-accent)] transition-colors">{icon}</span>
        <span className="text-[13px] text-[var(--tc-text-muted)] font-bold">{label}</span>
      </div>
      <span className="text-[14px] text-[var(--tc-text-primary)] font-black font-mono">{value}</span>
    </div>
  );
}

function TechStat({ icon, label, value }: { icon: React.ReactNode, label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-[var(--tc-divider)] last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-[var(--tc-text-muted)]">{icon}</span>
        <span className="text-[12px] text-[var(--tc-text-muted)] font-medium">{label}</span>
      </div>
      <span className="text-[13px] text-[var(--tc-text-primary)] font-semibold font-mono">{value}</span>
    </div>
  );
}
