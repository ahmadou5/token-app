"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowsCounterClockwise } from "@phosphor-icons/react";
import { TrendingUp } from "lucide-react";
import { useSwapSettings } from "@/context/SwapSettingsContext";
import { PROVIDER_META, EXECUTION_META } from "@/context/SwapSettingsContext";
import { SWAP_PROVIDER_ICONS, PERP_PROVIDER_ICONS } from "@/lib/yieldPrivider";

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
}

interface PricesResponse {
  ok: boolean;
  data: PriceData[];
  err: string | null;
}

export default function TradingSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const { settings, setExecutionStrategy } = useSwapSettings();
  const [isVisible, setIsVisible] = useState(false);
  const [prices, setPrices] = useState<PriceData[]>([]);


  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.15 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    async function fetchPrices() {
      try {
        const res = await fetch("/api/home/prices");
        const data = (await res.json()) as PricesResponse;
        setPrices(Array.isArray(data.data) ? data.data : []);
      } catch (err) {
        console.error("Failed to fetch prices:", err);
      }
    }
    fetchPrices();
  }, []);



  return (
    <section 
      id="trading" 
      ref={sectionRef} 
      className={`hp-section hp-trading-section ${isVisible ? 'hp-is-visible' : ''}`}
    >
      <div className="hp-label hp-anim-fade-up" style={{ marginBottom: '24px', textAlign: 'center' }}>
        Next-gen Trading
      </div>
      
      <div className="hp-trading-grid">
        {/* Spot Trading Card */}
        <div className="hp-trading-card hp-anim-fade-up hp-anim-delay-1">
          <div className="hp-trading-card__icon-circle hp-trading-card__icon-circle--spot">
            <ArrowsCounterClockwise size={32} weight="bold" />
          </div>
          <div>
            <span className="hp-label">Spot Trading</span>
            <h3 className="hp-headline">Swap any token instantly</h3>
            <p className="hp-subhead">Best routes via Jupiter Metis & Titan with MEV protection.</p>
          </div>

          <div className="hp-provider-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="hp-provider-row hp-anim-delay-2">
              <img 
                src={SWAP_PROVIDER_ICONS["metis"]} 
                alt="Jupiter Metis" 
                style={{ width: '24px', height: '24px', borderRadius: '50%' }} 
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>Jupiter Metis</span>
                  <span style={{ fontSize: '9px', padding: '2px 6px', background: 'var(--tc-accent)', color: 'white', borderRadius: '4px', textTransform: 'uppercase' }}>Default</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--tc-text-muted)' }}>Best routes</div>
              </div>
            </div>
            <div className="hp-provider-row hp-anim-delay-3">
              <img 
                src={SWAP_PROVIDER_ICONS["titan"]} 
                alt="Titan" 
                style={{ width: '24px', height: '24px', borderRadius: '50%' }} 
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>Titan</span>
                  <span style={{ fontSize: '9px', padding: '2px 6px', background: 'var(--tc-text-muted)', color: 'white', borderRadius: '4px', textTransform: 'uppercase' }}>MEV</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--tc-text-muted)' }}>MEV protected</div>
              </div>
            </div>
          </div>

          <div className="hp-exec-chips">
            {(Object.keys(EXECUTION_META) as (keyof typeof EXECUTION_META)[]).map((key) => {
              const opt = EXECUTION_META[key];
              const isActive = settings.executionStrategy === key;
              return (
                <button
                  key={key}
                  className={`hp-exec-chip ${isActive ? 'hp-exec-chip--active' : ''}`}
                  onClick={() => setExecutionStrategy(key)}
                >
                  <opt.icon/>
                  <span style={{ textTransform: 'capitalize' }}>{key}</span>
                </button>
              );
            })}
          </div>


          <Link href="/markets" className="tg-btn-primary tg-btn-lg" style={{ marginTop: 'auto' }}>
            Trade Spot →
          </Link>
        </div>

        {/* Perpetuals Card */}
        <div className="hp-trading-card hp-trading-card--perp hp-anim-fade-up hp-anim-delay-2">
          <div className="hp-trading-card__icon-circle hp-trading-card__icon-circle--perp">
            <TrendingUp size={32} />
          </div>
          <div>
            <span className="hp-label">Perpetuals</span>
            <h3 className="hp-headline">Long or short with up to 50× leverage</h3>
            <p className="hp-subhead">Adrena Protocol & Flash Trade. SOL, BTC, ETH and more.</p>
          </div>

          <div className="hp-provider-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="hp-provider-row hp-provider-row--right hp-anim-delay-3">
              <img 
                src={PERP_PROVIDER_ICONS["adrena"]} 
                alt="Adrena Protocol" 
                style={{ width: '24px', height: '24px', borderRadius: '50%' }} 
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>Adrena Protocol</span>
                  <span style={{ fontSize: '9px', padding: '2px 6px', background: 'var(--tc-accent-down)', color: 'white', borderRadius: '4px', textTransform: 'uppercase' }}>Default</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--tc-text-muted)' }}>SOL BTC ETH BONK JTO</div>
              </div>
            </div>
            <div className="hp-provider-row hp-provider-row--right hp-anim-delay-4">
              <img 
                src={PERP_PROVIDER_ICONS["flash"]} 
                alt="Flash Trade" 
                style={{ width: '24px', height: '24px', borderRadius: '50%' }} 
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>Flash Trade</span>
                  <span style={{ fontSize: '9px', padding: '2px 6px', background: 'var(--tc-accent-up)', color: 'white', borderRadius: '4px', textTransform: 'uppercase' }}>New</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--tc-text-muted)' }}>11 markets</div>
              </div>
            </div>
          </div>

          <div className="hp-perp-ticker">
            {(prices.length > 0 ? prices : [
              { symbol: "SOL-PERP", price: 0, change24h: 0 },
              { symbol: "BTC-PERP", price: 0, change24h: 0 },
              { symbol: "ETH-PERP", price: 0, change24h: 0 }
            ]).map((p, i) => (
              <div key={p.symbol} className={`hp-perp-ticker__row hp-anim-fade-up`} style={{ animationDelay: `${500 + i * 100}ms` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'var(--tc-font-mono)' }}>{p.symbol}</span>
                  <span style={{ 
                    fontSize: '9px', 
                    padding: '2px 6px', 
                    borderRadius: '4px', 
                    background: i % 2 === 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    color: i % 2 === 0 ? 'var(--tc-accent-up)' : 'var(--tc-accent-down)',
                    fontWeight: 600
                  }}>
                    {i % 2 === 0 ? 'LONG' : 'SHORT'}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--tc-font-mono)' }}>
                    {p.price > 0 ? `$${p.price.toLocaleString()}` : '—'}
                  </div>
                  <div style={{ 
                    fontSize: '11px', 
                    color: p.change24h >= 0 ? 'var(--tc-accent-up)' : 'var(--tc-accent-down)' 
                  }}>
                    {p.change24h >= 0 ? '+' : ''}{p.change24h}%
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Link href="/markets?tab=perp" className="tg-btn-primary tg-btn-lg" style={{ marginTop: 'auto', background: 'var(--tc-accent-down)' }}>
            Trade Perps →
          </Link>
        </div>
      </div>
    </section>
  );
}
