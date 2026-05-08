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
  ArrowUpRight
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
    <div className="vs-content flex flex-col gap-8">
      {/* Header Info */}
      <div className="vs-card bg-[var(--tc-bg)] border border-[var(--tc-border)] rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-start">
        <div className="vs-logo-wrap flex-shrink-0">
          {validator.avatar ? (
            <img src={validator.avatar} alt={validator.name} className="w-24 h-24 rounded-2xl border border-[var(--tc-border)] shadow-sm" />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-[var(--tc-bg-muted)] border border-[var(--tc-border)] flex items-center justify-center text-3xl font-bold text-[var(--tc-text-muted)]">
              {validator.name.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
        <div className="vs-info flex flex-col flex-1 gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold text-[var(--tc-text-primary)]">{validator.name}</h2>
            <div className="flex gap-2">
              {validator.isJito && (
                <span className="px-2 py-0.5 rounded bg-[#313131] text-[#00FFBD] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-[#00FFBD] animate-pulse" />
                  Jito MEV
                </span>
              )}
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${validator.status === 'active' ? 'bg-[var(--tc-accent-up-bg)] text-[var(--tc-accent-up)]' : 'bg-[var(--tc-accent-down-bg)] text-[var(--tc-accent-down)]'}`}>
                {validator.status}
              </span>
            </div>
          </div>
          
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-[var(--tc-text-muted)] font-mono text-[12px] bg-[var(--tc-surface)] px-2 py-1 rounded-lg border border-[var(--tc-border)] w-fit">
              <span className="opacity-60">Vote:</span>
              <span>{validator.votingPubkey}</span>
              <button 
                className="hover:text-[var(--tc-text-primary)] transition-colors ml-1" 
                onClick={() => navigator.clipboard.writeText(validator.votingPubkey)}
                title="Copy Address"
              >
                <svg viewBox="0 0 16 16" fill="none" width="12" height="12">
                  <path d="M4 4h8v8H4z" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M2 2h8v2H4v8H2z" fill="currentColor" opacity="0.3" />
                </svg>
              </button>
            </div>
          </div>

          <div className="vs-links flex gap-6 mt-1">
            {validator.website && (
              <a href={validator.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--tc-accent)] hover:underline">
                <Globe size={14} />
                Website
                <ArrowUpRight size={10} />
              </a>
            )}
            {validator.keybase && (
              <a href={`https://keybase.io/${validator.keybase}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--tc-accent)] hover:underline">
                <Info size={14} />
                Keybase
                <ArrowUpRight size={10} />
              </a>
            )}
          </div>
        </div>

        <div className="vs-metrics flex md:flex-col gap-6 md:border-l border-[var(--tc-divider)] md:pl-8 mt-4 md:mt-0 w-full md:w-auto">
          <div className="flex flex-col flex-1 md:flex-none">
            <span className="text-[10px] text-[var(--tc-text-muted)] uppercase font-bold tracking-widest mb-1">Commission</span>
            <div className="flex items-end gap-1">
              <span className="text-[24px] font-bold text-[var(--tc-text-primary)] leading-none">{validator.commission}%</span>
            </div>
          </div>
          <div className="flex flex-col flex-1 md:flex-none">
            <span className="text-[10px] text-[var(--tc-text-muted)] uppercase font-bold tracking-widest mb-1">Staking APY</span>
            <div className="flex items-end gap-1">
              <span className="text-[24px] font-bold text-[var(--tc-accent-up)] leading-none">{validator.apy.toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Charts & Details */}
      <div className="vs-details-grid grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 flex flex-col gap-8">
          
          {/* History Charts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="vs-card bg-[var(--tc-bg)] border border-[var(--tc-border)] rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[10px] text-[var(--tc-text-muted)] uppercase font-bold">Stake History</span>
                  <span className="text-[16px] font-bold text-[var(--tc-text-primary)]">{(validator.stake / 1e3).toFixed(1)}k SOL</span>
                </div>
                <div className="p-2 rounded-lg bg-[var(--tc-accent-up-bg)] text-[var(--tc-accent-up)]">
                  <ChartLineUp size={18} />
                </div>
              </div>
              <div className="h-16 w-full mt-2">
                 {stakeData.length > 1 ? (
                   <Sparkline data={stakeData} width={300} height={64} />
                 ) : (
                   <div className="h-full w-full bg-[var(--tc-surface)] rounded-lg border border-dashed border-[var(--tc-border)] flex items-center justify-center text-[10px] text-[var(--tc-text-muted)]">No history data available</div>
                 )}
              </div>
            </div>

            <div className="vs-card bg-[var(--tc-bg)] border border-[var(--tc-border)] rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[10px] text-[var(--tc-text-muted)] uppercase font-bold">Skip Rate</span>
                  <span className="text-[16px] font-bold text-[var(--tc-text-primary)]">{(validator.skipRate * 100).toFixed(2)}%</span>
                </div>
                <div className={`p-2 rounded-lg ${validator.skipRate < 0.05 ? 'bg-[var(--tc-accent-up-bg)] text-[var(--tc-accent-up)]' : 'bg-[var(--tc-accent-down-bg)] text-[var(--tc-accent-down)]'}`}>
                  {validator.skipRate < 0.05 ? <TrendDown size={18} /> : <TrendUp size={18} />}
                </div>
              </div>
              <div className="h-16 w-full mt-2">
                 {skipRateData.length > 1 ? (
                   <Sparkline data={skipRateData} width={300} height={64} positive={false} />
                 ) : (
                   <div className="h-full w-full bg-[var(--tc-surface)] rounded-lg border border-dashed border-[var(--tc-border)] flex items-center justify-center text-[10px] text-[var(--tc-text-muted)]">No history data available</div>
                 )}
              </div>
            </div>
          </div>

          {/* About Section */}
          <div className="vs-about-card bg-[var(--tc-bg)] border border-[var(--tc-border)] rounded-2xl p-8">
            <h3 className="text-xl font-bold text-[var(--tc-text-primary)] mb-6 flex items-center gap-2">
              <Info size={24} className="text-[var(--tc-accent)]" />
              About Validator
            </h3>
            <p className="text-[15px] text-[var(--tc-text-secondary)] leading-loose whitespace-pre-wrap">
              {validator.description || "This validator contributes to the security and decentralization of the Solana network by processing transactions and participating in consensus. They maintain high uptime and competitive APY for their delegators."}
            </p>
            
            <div className="mt-8 pt-8 border-t border-[var(--tc-divider)] grid grid-cols-1 sm:grid-cols-2 gap-8">
               <div className="flex flex-col gap-3">
                 <h4 className="text-[11px] font-bold text-[var(--tc-text-muted)] uppercase tracking-widest flex items-center gap-2">
                   <ClockCounterClockwise size={14} />
                   Epoch Credits
                 </h4>
                 <div className="flex flex-wrap gap-2">
                   {validator.epochCredits.length > 0 ? (
                     validator.epochCredits.slice(-5).reverse().map((credits, idx) => (
                       <div key={idx} className="bg-[var(--tc-surface)] border border-[var(--tc-border)] px-3 py-1.5 rounded-lg flex flex-col">
                         <span className="text-[9px] text-[var(--tc-text-muted)]">Last {idx === 0 ? 'Current' : idx}</span>
                         <span className="text-[12px] font-bold font-mono">{(credits / 1000).toFixed(0)}k</span>
                       </div>
                     ))
                   ) : (
                     <span className="text-[12px] italic text-[var(--tc-text-muted)]">Credits pending...</span>
                   )}
                 </div>
               </div>

               <div className="flex flex-col gap-3">
                 <h4 className="text-[11px] font-bold text-[var(--tc-text-muted)] uppercase tracking-widest flex items-center gap-2">
                   <CheckCircle size={14} />
                   Network Security
                 </h4>
                 <p className="text-[13px] text-[var(--tc-text-muted)] leading-relaxed italic">
                   Staking SOL with this validator contributes to the {validator.rank < 20 ? 'high' : 'decentralized'} security tier of the Solana mainnet.
                 </p>
               </div>
            </div>
          </div>
        </div>

        {/* Technical Sidebar */}
        <div className="flex flex-col gap-8">
          <div className="vs-tech-card bg-[var(--tc-bg)] border border-[var(--tc-border)] rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-[var(--tc-text-primary)] mb-5 flex items-center gap-2">
              <Cpu size={20} className="text-[var(--tc-text-muted)]" />
              Technical Stats
            </h3>
            <div className="flex flex-col gap-4">
              <TechStat icon={<ChartLineUp size={14} />} label="Network Rank" value={`#${validator.rank}`} />
              <TechStat icon={<Info size={14} />} label="Software Version" value={validator.version || "Unknown"} />
              <TechStat icon={<CheckCircle size={14} />} label="Uptime" value={validator.uptime ? `${(validator.uptime * 100).toFixed(2)}%` : "99.9%"} />
              <TechStat icon={<TrendDown size={14} />} label="Skip Rate" value={`${(validator.skipRate * 100).toFixed(1)}%`} />
              <TechStat icon={<Globe size={14} />} label="Data Center" value={validator.dataCenter} />
              <TechStat icon={<MapPin size={14} />} label="Location" value={`${validator.city || "Unknown"}, ${validator.country || "Unknown"}`} />
            </div>
          </div>

          {/* Mini Stake Form / Status */}
          <div className="vs-stake-card bg-[var(--tc-bg)] border border-[var(--tc-border)] rounded-2xl p-6 shadow-sm flex flex-col gap-6">
            <h3 className="text-lg font-bold text-[var(--tc-text-primary)] flex items-center justify-between">
              Your Position
              {existingStake && (
                <span className="px-2 py-0.5 rounded-full bg-[var(--tc-accent-up-bg)] text-[var(--tc-accent-up)] text-[9px] font-bold uppercase tracking-wider">
                  {existingStake.status}
                </span>
              )}
            </h3>

            {existingStake ? (
               <div className="flex flex-col gap-5">
                 <div className="bg-[var(--tc-surface)] rounded-xl p-4 border border-[var(--tc-border)]">
                   <span className="text-[10px] text-[var(--tc-text-muted)] uppercase font-bold">Staked Amount</span>
                   <div className="text-[20px] font-bold text-[var(--tc-text-primary)] font-mono">{existingStake.amount} SOL</div>
                 </div>

                 {existingStake.status === "active" ? (
                   <button
                     className="w-full p-3 rounded-xl border border-[var(--tc-accent-down)] text-[var(--tc-accent-down)] font-bold hover:bg-[var(--tc-accent-down-bg)] transition-colors text-[13px]"
                     onClick={() => handleUnstake(existingStake.address)}
                     disabled={isExecuting}
                   >
                     {isExecuting ? "Processing..." : "Unstake SOL"}
                   </button>
                 ) : (
                   <button
                     className="w-full p-3 rounded-xl bg-[var(--tc-accent-up)] text-white font-bold hover:opacity-90 transition-opacity text-[13px]"
                     onClick={() => handleWithdraw(existingStake.address, existingStake.amount)}
                     disabled={isExecuting}
                   >
                     {isExecuting ? "Processing..." : "Withdraw to Wallet"}
                   </button>
                 )}
               </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="sw-perp-form__field">
                  <div className="sw-perp-form__field-hdr">
                    <span className="sw-perp-form__field-label">Amount</span>
                    <button className="sw-bal-btn" onClick={handleMax}>
                      Max: {solBalance?.toFixed(3) ?? "0.00"}
                    </button>
                  </div>
                  <div className="sw-perp-form__input-row !bg-[var(--tc-surface)] !p-2 !rounded-xl !border !border-[var(--tc-border)]">
                    <input
                      type="number"
                      placeholder="0.00"
                      className="sw-perp-form__input !text-lg"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                    <span className="font-bold text-[12px] opacity-60">SOL</span>
                  </div>
                </div>

                <div className="bg-[var(--tc-accent-up-bg)] rounded-xl p-4 border border-[var(--tc-accent-up-bg)] flex flex-col gap-2">
                   <div className="flex justify-between items-center">
                     <span className="text-[11px] text-[var(--tc-accent-up)] font-medium">Estimated Daily</span>
                     <span className="text-[11px] font-bold text-[var(--tc-accent-up)]">{estimatedDaily.toFixed(5)} SOL</span>
                   </div>
                </div>

                <button
                  className={`sw-swap-btn w-full ${isExecuting ? "sw-swap-btn--busy" : ""}`}
                  disabled={!isConnected || isExecuting || !amount}
                  onClick={handleStake}
                >
                  {isExecuting && <span className="sw-spinner mr-2" />}
                  {isConnected ? (isExecuting ? "Processing…" : "Confirm Stake") : "Connect Wallet"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
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
