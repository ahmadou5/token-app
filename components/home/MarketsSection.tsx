"use client";

import { useEffect, useRef, useState, useLayoutEffect, useMemo } from "react";
import Link from "next/link";
import { fmtCompact } from "@/components/TokenCard";
import { useTokens } from "@/hooks/useToken";

export default function MarketsSection({ initialTokens = [] }: { initialTokens?: any[] }) {
  const {
    filtered,
    categories,
    activeCategory,
    setActiveCategory,
    isLoading
  } = useTokens(initialTokens);
  
  // Helper to map API token to our UI format
  const mapToken = (t: any) => ({
    symbol: t.symbol || "Unknown",
    name: t.name || "Unknown",
    price: t.stats?.price || 0,
    change24h: t.stats?.priceChange24hPercent || 0,
    volume24h: fmtCompact(t.stats?.volume24hUSD || 0),
    logoUri: t.imageUrl || t.primaryVariant?.market?.logoURI || ""
  });

  const tokens = useMemo(() => filtered.slice(0, 10).map(mapToken), [filtered]);
  const [sliderStyle, setSliderStyle] = useState({ left: 0, width: 0 });
  
  const tabsRef = useRef<HTMLDivElement>(null);
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

  useLayoutEffect(() => {
    const activeTab = tabsRef.current?.querySelector(`[data-id="${activeCategory}"]`) as HTMLElement;
    if (activeTab) {
      setSliderStyle({
        left: activeTab.offsetLeft,
        width: activeTab.offsetWidth,
      });
    }
  }, [activeCategory, categories]); // Added categories to deps to ensure slider updates when tabs render

  return (
    <section 
      id="markets" 
      ref={sectionRef}
      className={`hp-section hp-markets-section ${isVisible ? 'hp-is-visible' : ''}`}
    >
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div className="hp-label hp-anim-fade-up">Live Markets</div>
        <h2 className="hp-headline hp-anim-fade-up hp-anim-delay-1">Top tokens across every category.</h2>
      </div>

      <div className="hp-cat-tabs hp-anim-fade-up hp-anim-delay-2" ref={tabsRef}>
        <div 
          className="hp-cat-tab-slider" 
          style={{ 
            left: `${sliderStyle.left}px`, 
            width: `${sliderStyle.width}px` 
          }} 
        />
        {categories.map((cat) => (
          <button
            key={cat.key}
            data-id={cat.key}
            className={`hp-cat-tab ${activeCategory === cat.key ? 'hp-cat-tab--active' : ''}`}
            onClick={() => setActiveCategory(cat.key)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <div className="hp-market-table hp-anim-fade-up hp-anim-delay-3">
        <div className="hp-market-header">
          <span></span>
          <span>Asset</span>
          <span style={{ textAlign: 'right' }}>Price</span>
          <span style={{ textAlign: 'right' }}>24h Change</span>
          <span style={{ textAlign: 'right' }}>Volume</span>
        </div>

        <div key={activeCategory} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {isLoading ? (
            Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="hp-market-row" style={{ animationDelay: `${i * 40}ms`, opacity: 0.5 }}>
                <div className="hp-market-row__logo hp-skeleton" />
                <div className="hp-market-row__identity">
                  <div className="hp-skeleton" style={{ width: '80px', height: '14px' }} />
                  <div className="hp-skeleton" style={{ width: '40px', height: '10px' }} />
                </div>
                <div className="hp-skeleton" style={{ marginLeft: 'auto', width: '60px', height: '14px' }} />
                <div className="hp-skeleton" style={{ marginLeft: 'auto', width: '50px', height: '14px' }} />
                <div className="hp-skeleton" style={{ marginLeft: 'auto', width: '60px', height: '14px' }} />
              </div>
            ))
          ) : (
            tokens.map((token, i) => (
              <div 
                key={token.symbol} 
                className="hp-market-row"
                style={{ animationDelay: `${i * 40}ms` }}
                onClick={() => window.location.href = `/token/${token.symbol}`}
              >
                <div className="hp-market-row__logo">
                  {token.logoUri ? (
                    <img src={token.logoUri} alt={token.name} />
                  ) : (
                    token.symbol[0]
                  )}
                </div>
                <div className="hp-market-row__identity">
                  <span className="hp-market-row__name">{token.name}</span>
                  <span className="hp-market-row__symbol">{token.symbol}</span>
                </div>
                <div className="hp-market-row__price" style={{ textAlign: 'right' }}>
                  ${token.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: token.price < 1 ? 6 : 2 })}
                </div>
                <div 
                  className="hp-market-row__change" 
                  style={{ 
                    textAlign: 'right',
                    color: token.change24h >= 0 ? 'var(--tc-accent-up)' : 'var(--tc-accent-down)'
                  }}
                >
                  {token.change24h >= 0 ? '▲' : '▼'} {(token.change24h)}%
                </div>
                <div className="hp-market-row__volume" style={{ textAlign: 'right' }}>
                  ${token.volume24h}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Link href="/markets" className="hp-btn-secondary hp-explore-btn hp-anim-fade-up hp-anim-delay-5">
        Explore all markets
        <svg viewBox="0 0 16 16" fill="none" width="14" height="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 8h6M8 5l3 3-3 3" />
        </svg>
      </Link>
    </section>
  );
}
