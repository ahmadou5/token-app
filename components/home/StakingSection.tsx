"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Shield, ArrowRight, Coins } from "@phosphor-icons/react";

interface Validator {
  rank: number;
  name: string;
  voteAccount: string;
  apyEstimate: number;
  commission: number;
  activatedStake: number;
}

export default function StakingSection({ initialValidators = [] }: { initialValidators?: any[] }) {
  const [validators, setValidators] = useState<Validator[]>(() => {
    return initialValidators.slice(0, 10).map((v, i) => ({
      rank: i + 1,
      name: v.name || "Unknown",
      voteAccount: v.votingPubkey || v.address || "",
      apyEstimate: v.apy || 0,
      commission: v.commission || 0,
      activatedStake: v.activatedStake || 0,
    }));
  });
  const [avgApy, setAvgApy] = useState(() => {
    if (initialValidators.length === 0) return 7.42;
    const top10 = initialValidators.slice(0, 10);
    const avg = top10.reduce((acc, v) => acc + (v.apy || 0), 0) / top10.length;
    return avg || 7.42;
  });
  const [isLoading, setIsLoading] = useState(initialValidators.length === 0);
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (initialValidators.length > 0) return;

    async function fetchValidators() {
      try {
        const res = await fetch("/api/validators");
        const data = await res.json();
        const validatorsData = data.validators || data; // handle both shapes
        const top10 = validatorsData.slice(0, 10).map((v: any, i: number) => ({
          rank: i + 1,
          name: v.name || "Unknown",
          voteAccount: v.votingPubkey || v.address || v.voteAccount || "",
          apyEstimate: v.apy || v.apyEstimate || 0,
          commission: v.commission || 0,
          activatedStake: v.activatedStake || 0,
        }));
        setValidators(top10);

        const avg = top10.reduce((acc: number, v: any) => acc + (v.apyEstimate || 0), 0) / top10.length;
        setAvgApy(avg || 7.42);
      } catch (err) {
        console.error("Failed to fetch validators:", err);
        setAvgApy(7.42);
      } finally {
        setIsLoading(false);
      }
    }
    fetchValidators();
  }, [initialValidators]);

  const formatStake = (num: number) => {
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M SOL`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K SOL`;
    return `${num.toFixed(0)} SOL`;
  };

  return (
    <section 
      id="staking" 
      ref={sectionRef}
      className={`hp-section hp-staking-section ${isVisible ? 'hp-is-visible' : ''}`}
    >
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div className="hp-label hp-anim-fade-up">Native Staking</div>
        <h2 className="hp-headline hp-anim-fade-up hp-anim-delay-1">Delegate SOL. Earn ~7% APY.</h2>
        <p className="hp-subhead hp-anim-fade-up hp-anim-delay-2" style={{ maxWidth: '600px', margin: '16px auto 0' }}>
          Your SOL stays in your stake account. You control it. No custodians.
        </p>
      </div>

      <div className="hp-network-apy hp-anim-fade-up hp-anim-delay-3">
        <div className="hp-apy-display">
          {isLoading ? "7.42%" : `${avgApy.toFixed(2)}%`}
        </div>
        <div className="hp-label">Current network APY</div>
      </div>

      <div className="hp-validator-grid">
        {isLoading ? (
          Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="hp-validator-card hp-skeleton" style={{ height: '88px', opacity: 0.5 }} />
          ))
        ) : (
          <>
            {validators.map((v, i) => (
              <Link 
                key={v.voteAccount} 
                href={`/validators/${v.voteAccount}`}
                className="hp-validator-card hp-anim-fade-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div 
                  className="hp-validator-rank hp-anim-scale-in" 
                  style={{ animationDelay: `${i * 60 + 200}ms` }}
                >
                  {v.rank}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div 
                    style={{ fontSize: '13px', fontWeight: 600, color: 'var(--tc-text-primary)' }}
                    className="hp-truncate"
                  >
                    {v.name.length > 24 ? v.name.slice(0, 24) + '...' : v.name}
                  </div>
                  <div style={{ fontSize: '10px', fontFamily: 'var(--tc-font-mono)', color: 'var(--tc-text-muted)' }}>
                    {v.voteAccount ? `${v.voteAccount.slice(0, 4)}...${v.voteAccount.slice(-4)}` : 'Unknown'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--tc-accent-up)', fontFamily: 'var(--tc-font-mono)' }}>
                    {v.apyEstimate.toFixed(2)}%
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--tc-text-muted)' }}>
                    {v.commission}% fee • {formatStake(v.activatedStake)}
                  </div>
                </div>
              </Link>
            ))}
            <Link 
              href="/validators" 
              className="hp-validator-card hp-validator-card--explore hp-anim-fade-up"
              style={{ animationDelay: '600ms' }}
            >
              Explore all validators →
            </Link>
          </>
        )}
      </div>

      <div className="hp-how-it-works hp-anim-fade-up hp-anim-delay-5">
        <div className="hp-how-step">
          <div className="hp-how-step__num">1</div>
          <Shield size={32} weight="duotone" style={{ color: 'var(--tc-accent)' }} />
          <h4 style={{ fontWeight: 700, fontSize: '16px' }}>Choose a validator</h4>
          <p style={{ fontSize: '13px', color: 'var(--tc-text-secondary)' }}>Select from the highest performing nodes.</p>
        </div>
        <div className="hp-how-step">
          <div className="hp-how-step__num">2</div>
          <ArrowRight size={32} weight="bold" style={{ color: 'var(--tc-accent)' }} />
          <h4 style={{ fontWeight: 700, fontSize: '16px' }}>Delegate SOL</h4>
          <p style={{ fontSize: '13px', color: 'var(--tc-text-secondary)' }}>Send stake instruction from your wallet.</p>
        </div>
        <div className="hp-how-step">
          <div className="hp-how-step__num">3</div>
          <Coins size={32} weight="duotone" style={{ color: 'var(--tc-accent)' }} />
          <h4 style={{ fontWeight: 700, fontSize: '16px' }}>Earn rewards</h4>
          <p style={{ fontSize: '13px', color: 'var(--tc-text-secondary)' }}>Rewards accrue automatically every ~2 days.</p>
        </div>
      </div>
    </section>
  );
}
