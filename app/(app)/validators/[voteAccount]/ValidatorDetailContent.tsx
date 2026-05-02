"use client";

import { useState, useEffect, useMemo } from "react";
import { Validator } from "@/hooks/useValidators";
import { useWallet, useBalance } from "@solana/connector";
import { useStakeTransaction, StakePosition } from "@/hooks/useStakeTransaction";

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

  return (
    <div className="vs-content flex flex-col gap-8">
      {/* Header Info */}
      <div className="vs-card bg-[var(--tc-bg)] border border-[var(--tc-border)] rounded-2xl p-6 flex flex-col md:flex-row gap-6">
        <div className="vs-logo-wrap flex-shrink-0">
          {validator.avatar ? (
            <img src={validator.avatar} alt={validator.name} className="w-20 h-20 rounded-2xl border border-[var(--tc-border)]" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-[var(--tc-bg-muted)] border border-[var(--tc-border)] flex items-center justify-center text-2xl font-bold">
              {validator.name.slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
        <div className="vs-info flex flex-col flex-1 gap-2">
          <h2 className="text-xl font-bold text-[var(--tc-text-primary)]">{validator.name}</h2>
          <div className="flex items-center gap-2 text-[var(--tc-text-muted)] font-mono text-[13px]">
            <span>{validator.votingPubkey}</span>
            <button className="hover:text-[var(--tc-text-primary)] transition-colors" onClick={() => navigator.clipboard.writeText(validator.votingPubkey)}>
              <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                <path d="M4 4h8v8H4z" stroke="currentColor" strokeWidth="1.5" />
                <path d="M2 2h8v2H4v8H2z" fill="currentColor" opacity="0.3" />
              </svg>
            </button>
          </div>
          <div className="vs-links flex gap-4 mt-2">
            {validator.website && (
              <a href={validator.website} target="_blank" rel="noopener noreferrer" className="text-[12px] text-[var(--tc-accent)] hover:underline">Website</a>
            )}
            {validator.keybase && (
              <a href={`https://keybase.io/${validator.keybase}`} target="_blank" rel="noopener noreferrer" className="text-[12px] text-[var(--tc-accent)] hover:underline">Keybase</a>
            )}
          </div>
        </div>
        <div className="vs-metrics grid grid-cols-2 md:flex md:flex-col gap-4 border-l border-[var(--tc-divider)] pl-6">
          <div className="flex flex-col">
            <span className="text-[10px] text-[var(--tc-text-muted)] uppercase font-semibold">Commission</span>
            <span className="text-[16px] font-bold text-[var(--tc-text-primary)]">{validator.commission}%</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-[var(--tc-text-muted)] uppercase font-semibold">APY</span>
            <span className="text-[16px] font-bold text-[var(--tc-accent-up)]">{validator.apy.toFixed(2)}%</span>
          </div>
        </div>
      </div>

      <div className="vs-grid grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Stake Form */}
        <div className="vs-stake-card bg-[var(--tc-bg)] border border-[var(--tc-border)] rounded-2xl p-6 flex flex-col gap-6">
          <h3 className="text-lg font-bold text-[var(--tc-text-primary)]">Stake SOL</h3>
          
          <div className="sw-perp-form__field">
            <div className="sw-perp-form__field-hdr">
              <span className="sw-perp-form__field-label">Amount</span>
              <button className="sw-bal-btn" onClick={handleMax}>
                Max: {solBalance?.toFixed(4) ?? "0.00"}
              </button>
            </div>
            <div className="sw-perp-form__input-row">
              <input
                type="number"
                placeholder="0.00"
                className="sw-perp-form__input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <span className="sw-perp-form__input-token">SOL</span>
            </div>
          </div>

          <div className="vs-rewards-est bg-[var(--tc-bg-muted)] rounded-xl p-4 flex flex-col gap-3">
            <span className="text-[11px] font-semibold text-[var(--tc-text-muted)] uppercase">Estimated Rewards</span>
            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col">
                <span className="text-[10px] text-[var(--tc-text-muted)]">Daily</span>
                <span className="text-[13px] font-bold text-[var(--tc-text-primary)]">{estimatedDaily.toFixed(6)} SOL</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-[var(--tc-text-muted)]">Monthly</span>
                <span className="text-[13px] font-bold text-[var(--tc-text-primary)]">{(estimatedDaily * 30).toFixed(4)} SOL</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-[var(--tc-text-muted)]">Annual</span>
                <span className="text-[13px] font-bold text-[var(--tc-text-primary)]">{(estimatedDaily * 365).toFixed(2)} SOL</span>
              </div>
            </div>
          </div>

          {txError && <div className="sw-error">{txError}</div>}

          <button
            className={`sw-swap-btn mt-2 ${isExecuting ? "sw-swap-btn--busy" : ""}`}
            disabled={!isConnected || isExecuting || !amount}
            onClick={handleStake}
          >
            {isExecuting && <span className="sw-spinner" />}
            {isExecuting ? "Processing…" : isConnected ? "Stake SOL" : "Connect Wallet"}
          </button>
        </div>

        {/* Unstake Section */}
        <div className="vs-unstake-card bg-[var(--tc-bg)] border border-[var(--tc-border)] rounded-2xl p-6 flex flex-col gap-6">
          <h3 className="text-lg font-bold text-[var(--tc-text-primary)]">Your Staking</h3>
          
          {existingStake ? (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center p-4 rounded-xl bg-[var(--tc-bg-muted)] border border-[var(--tc-border)]">
                <div className="flex flex-col">
                  <span className="text-[12px] text-[var(--tc-text-muted)]">Current Stake</span>
                  <span className="text-[18px] font-bold text-[var(--tc-text-primary)]">{existingStake.amount} SOL</span>
                </div>
                <div className="px-3 py-1 rounded-full bg-[var(--tc-accent-up-bg)] text-[var(--tc-accent-up)] text-[11px] font-bold uppercase">
                  {existingStake.status}
                </div>
              </div>
              
              {existingStake.status === "active" ? (
                <button
                  className="p-3 rounded-xl border border-[var(--tc-accent-down)] text-[var(--tc-accent-down)] font-bold hover:bg-[var(--tc-accent-down-bg)] transition-colors"
                  onClick={() => handleUnstake(existingStake.address)}
                  disabled={isExecuting}
                >
                  Unstake
                </button>
              ) : (
                <button
                  className="p-3 rounded-xl bg-[var(--tc-accent-up)] text-white font-bold hover:opacity-90 transition-opacity"
                  onClick={() => handleWithdraw(existingStake.address, existingStake.amount)}
                  disabled={isExecuting}
                >
                  Withdraw to Wallet
                </button>
              )}
              
              <p className="text-[11px] text-[var(--tc-text-muted)] leading-relaxed italic">
                {existingStake.status === "active" 
                  ? "Note: Unstaking takes ~2-3 days (one epoch) to complete."
                  : "Stake is inactive and ready to be withdrawn."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" width="48" height="48" className="text-[var(--tc-text-muted)] opacity-20">
                <path d="M12 2v20M2 12h20" stroke="currentColor" strokeWidth="1" />
              </svg>
              <p className="text-[14px] text-[var(--tc-text-muted)]">No active stake with this validator</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
