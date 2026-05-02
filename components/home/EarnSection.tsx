"use client";

import { useEffect, useRef, useState } from "react";
import { GearSix, CheckCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { EARN_PROVIDER_META, EarnProvider } from "@/context/SwapSettingsContext";
import { getProviderColor, getProviderIcon, PROVIDER_ICONS } from "@/lib/yieldPrivider";

interface VaultProps {
  protocol: string;
  color: string;
  label: string;
  apy: number;
  tvl: string;
  delay: string;
}

function VaultCard({ protocol, color, apy, tvl, delay, label }: VaultProps) {
  const [currentApy, setCurrentApy] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          animateApy();
        }
      },
      { threshold: 0.2 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [hasAnimated]);

  const animateApy = () => {
    let start = 0;
    const end = apy;
    const duration = 1500;
    const startTime = performance.now();

    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutExpo = 1 - Math.pow(2, -10 * progress);
      const current = start + (end - start) * easeOutExpo;
      
      setCurrentApy(current);

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        setCurrentApy(end);
      }
    };

    requestAnimationFrame(update);
  };

  return (
    <div 
      ref={cardRef}
      className={`hp-earn-card hp-anim-scale-in`}
      style={{ animationDelay: delay }}
    >
      <div className="hp-earn-card__header">
        <div className="hp-earn-card__logo" style={{ background: color }}>
          <img className="w-full h-full rounded-xl" src={PROVIDER_ICONS[protocol as EarnProvider]} alt={protocol} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontWeight: 700 }}>{label}</span>
            <CheckCircle size={14} weight="fill" style={{ color: 'var(--tc-accent)' }} />
          </div>
          <span className="hp-label" style={{ fontSize: '9px' }}>Verified</span>
        </div>
      </div>

      <div>
        <div className="hp-earn-card__apy">
          {currentApy.toFixed(1)}
          <span className="hp-earn-card__apy-sign">%</span>
        </div>
        <div className="hp-label">Current APY</div>
      </div>

      <div className="hp-earn-card__stables">
        <span className="hp-earn-card__stable-pill">USDC</span>
        <span className="hp-earn-card__stable-pill">USDT</span>
        <span className="hp-earn-card__stable-pill">USDG</span>
      </div>

      <div className="hp-earn-card__stats">
        <div className="hp-earn-card__stat">
          <span className="hp-label" style={{ fontSize: '9px' }}>TVL</span>
          <span style={{ fontSize: '13px', fontWeight: 600 }}>{tvl}</span>
        </div>
        <div className="hp-earn-card__stat">
          <span className="hp-label" style={{ fontSize: '9px' }}>Vaults</span>
          <span style={{ fontSize: '13px', fontWeight: 600 }}>3 Active</span>
        </div>
      </div>

      <Link 
        href="/token/usd?mint=Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB" 
        className="hp-earn-card__cta"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = color;
          e.currentTarget.style.borderColor = color;
          e.currentTarget.style.color = 'white';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderColor = 'var(--tc-border)';
          e.currentTarget.style.color = 'var(--tc-text-primary)';
        }}
      >
        Deposit →
      </Link>
    </div>
  );
}

export function EarnSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section 
      id="earn" 
      ref={sectionRef}
      className={`hp-section hp-earn-section ${isVisible ? 'hp-is-visible' : ''} rounded-2xl`}
    >
       <div 
        className="hp-blur-circle" 
        style={{ width: '400px', height: '400px', background: 'rgba(153,69,255,0.06)', top: '-100px', left: '-100px', animation: 'hpFloat 8s ease-in-out infinite' }} 
      />
           <div 
        className="hp-blur-circle" 
        style={{ width: '350px', height: '350px', background: 'rgba(74,222,128,0.05)', bottom: '-100px', right: '-100px', animation: 'hpFloat 12s ease-in-out infinite', animationDelay: '4s' }} 
      /> 
      {/* Animated background detail 
      <div 
        className="hp-blur-circle" 
        style={{ width: '400px', height: '400px', background: 'rgba(153,69,255,0.06)', top: '-100px', left: '-100px', animation: 'hpFloat 8s ease-in-out infinite' }} 
      />
      <div 
        className="hp-blur-circle" 
        style={{ width: '300px', height: '300px', background: 'rgba(99,153,255,0.05)', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', animation: 'hpFloat 10s ease-in-out infinite', animationDelay: '2s' }} 
      />
      <div 
        className="hp-blur-circle" 
        style={{ width: '350px', height: '350px', background: 'rgba(74,222,128,0.05)', bottom: '-100px', right: '-100px', animation: 'hpFloat 12s ease-in-out infinite', animationDelay: '4s' }} 
      /> */}

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', marginBottom: '48px' }}>
        <div className="hp-label hp-anim-fade-up">Yield Vaults</div>
        <h2 className="hp-headline hp-anim-fade-up hp-anim-delay-1">Put your stables to work.</h2>
      </div>

      <div className="hp-earn-grid">
        {Object.entries(EARN_PROVIDER_META).map(([protocol, meta]) => (
          <VaultCard 
            key={protocol}
            protocol={protocol}
            label={meta.label}
            color={getProviderColor(protocol as EarnProvider)}
            apy={8.9}
            tvl={'$252M'}
            delay="0ms"
          />
        ))}
      </div>

      <div className="hp-settings-hint hp-anim-fade-up hp-anim-delay-4">
        <GearSix size={14} weight="bold" />
        <span>Switch vault providers anytime in Settings</span>
      </div>
    </section>
  );
}
