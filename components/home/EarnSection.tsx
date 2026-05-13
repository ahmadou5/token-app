"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { GearSix, CheckCircle, CaretDown } from "@phosphor-icons/react";
import Link from "next/link";
import { EARN_PROVIDER_META, EarnProvider } from "@/context/SwapSettingsContext";
import { getProviderColor, PROVIDER_ICONS } from "@/lib/yieldPrivider";

// ─── Stablecoin options ───────────────────────────────────────────────────────
const STABLES = [
  { symbol: "USDC", label: "USDC", icon: "💵" },
  { symbol: "USDT", label: "USDT", icon: "💵" },
  { symbol: "USDG", label: "USDG", icon: "💵" },
] as const;

type StableSymbol = (typeof STABLES)[number]["symbol"];

// ─── Stable selector dropdown ─────────────────────────────────────────────────
function StableDropdown({
  selected,
  onChange,
}: {
  selected: StableSymbol;
  onChange: (s: StableSymbol) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} className="hp-stable-selector" style={{ position: "relative" }}>
      <button
        className="hp-stable-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label="Switch stablecoin"
      >
        <span className="hp-stable-btn__label">{selected}</span>
        <CaretDown
          size={11}
          weight="bold"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 160ms",
            flexShrink: 0,
          }}
        />
      </button>

      {open && (
        <div className="hp-stable-dropdown">
          {STABLES.map((s) => (
            <button
              key={s.symbol}
              className={`hp-stable-option ${selected === s.symbol ? "hp-stable-option--active" : ""}`}
              onClick={() => {
                onChange(s.symbol);
                setOpen(false);
              }}
            >
              <span className="hp-stable-option__sym">{s.symbol}</span>
              {selected === s.symbol && (
                <CheckCircle size={12} weight="fill" style={{ color: "var(--tc-accent)", marginLeft: "auto" }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Vault card ───────────────────────────────────────────────────────────────
interface VaultProps {
  protocol: string;
  color: string;
  label: string;
  apy: number;
  tvl: string;
  delay: string;
  loading: boolean;
}

function VaultCard({ protocol, color, apy, tvl, delay, label, loading }: VaultProps) {
  const [displayApy, setDisplayApy] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  // Animate APY counter whenever the apy prop changes AND card is visible
  const animateApy = useCallback(
    (targetApy: number) => {
      const start = displayApy;
      const end = targetApy;
      const duration = 900;
      const startTime = performance.now();

      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }

      const update = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(2, -10 * progress);
        setDisplayApy(start + (end - start) * ease);

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(update);
        } else {
          setDisplayApy(end);
        }
      };

      rafRef.current = requestAnimationFrame(update);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apy]
  );

  // Intersection observer — kick off animation on first intersection
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          animateApy(apy);
        }
      },
      { threshold: 0.2 }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAnimated]);

  // Re-animate when APY changes after initial render
  useEffect(() => {
    if (hasAnimated) {
      animateApy(apy);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apy]);

  return (
    <div
      ref={cardRef}
      className="hp-earn-card hp-anim-scale-in"
      style={{ animationDelay: delay }}
    >
      <div className="hp-earn-card__header">
        <div className="hp-earn-card__logo">
          <img
            className="w-full h-full rounded-xl"
            src={PROVIDER_ICONS[protocol as EarnProvider]}
            alt={protocol}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ fontWeight: 700 }}>{label}</span>
            <CheckCircle size={14} weight="fill" style={{ color: "var(--tc-accent)" }} />
          </div>
          <span className="hp-label" style={{ fontSize: "9px" }}>
            Verified
          </span>
        </div>
      </div>

      <div>
        <div className="hp-earn-card__apy" style={{ position: "relative" }}>
          {loading ? (
            <span
              style={{
                display: "inline-block",
                width: "90px",
                height: "48px",
                borderRadius: "8px",
                background:
                  "linear-gradient(90deg, var(--tc-bg-muted) 25%, var(--tc-border) 50%, var(--tc-bg-muted) 75%)",
                backgroundSize: "200% 100%",
                animation: "hpShimmer 1.5s infinite",
              }}
            />
          ) : (
            <>
              {displayApy.toFixed(1)}
              <span className="hp-earn-card__apy-sign">%</span>
            </>
          )}
        </div>
        <div className="hp-label">Current APY</div>
      </div>

      <div className="hp-earn-card__stats">
        <div className="hp-earn-card__stat">
          <span className="hp-label" style={{ fontSize: "9px" }}>
            TVL
          </span>
          <span style={{ fontSize: "13px", fontWeight: 600 }}>{tvl}</span>
        </div>
        <div className="hp-earn-card__stat">
          <span className="hp-label" style={{ fontSize: "9px" }}>
            Vaults
          </span>
          <span style={{ fontSize: "13px", fontWeight: 600 }}>3 Active</span>
        </div>
      </div>

      <Link
        href="/token/usd?mint=Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
        className="hp-earn-card__cta"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = color;
          e.currentTarget.style.borderColor = color;
          e.currentTarget.style.color = "white";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.borderColor = "var(--tc-border)";
          e.currentTarget.style.color = "var(--tc-text-primary)";
        }}
      >
        Deposit →
      </Link>
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────
export function EarnSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [selectedStable, setSelectedStable] = useState<StableSymbol>("USDC");
  const [yieldData, setYieldData] = useState<Record<string, { apy: number; tvlUsd: number }> | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch yields whenever selectedStable changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function fetchData() {
      try {
        const res = await fetch(`/api/yield/quote/all?symbol=${selectedStable}`);
        const data = await res.json();
        if (!cancelled && data.apyMap) {
          setYieldData(data.apyMap);
        }
      } catch (err) {
        console.error("Failed to fetch yield data:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [selectedStable]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.2 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const formatTVL = (usd: number) => {
    if (usd >= 1e9) return `$${(usd / 1e9).toFixed(1)}B`;
    if (usd >= 1e6) return `$${(usd / 1e6).toFixed(1)}M`;
    return `$${usd.toLocaleString()}`;
  };

  // Fallback APYs
  const FALLBACK_APYS: Record<string, number> = {
    kamino: 7.2,
    marginfi: 6.5,
    drift: 8.0,
    jupiter: 4.5,
  };

  return (
    <section
      id="earn"
      ref={sectionRef}
      className={`hp-section hp-earn-section ${isVisible ? "hp-is-visible" : ""} rounded-2xl`}
    >
      {/* Decorative blurs */}
      <div
        className="hp-blur-circle"
        style={{
          width: "400px",
          height: "400px",
          background: "rgba(153,69,255,0.06)",
          top: "-100px",
          left: "-100px",
          animation: "hpFloat 8s ease-in-out infinite",
        }}
      />
      <div
        className="hp-blur-circle"
        style={{
          width: "300px",
          height: "300px",
          background: "rgba(99,153,255,0.05)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          animation: "hpFloat 10s ease-in-out infinite",
          animationDelay: "2s",
        }}
      />
      <div
        className="hp-blur-circle"
        style={{
          width: "350px",
          height: "350px",
          background: "rgba(74,222,128,0.05)",
          bottom: "-100px",
          right: "-100px",
          animation: "hpFloat 12s ease-in-out infinite",
          animationDelay: "4s",
        }}
      />

      {/* Header + stable switcher */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginBottom: "48px",
          gap: "20px",
        }}
      >
        <div className="hp-label hp-anim-fade-up">Yield Vaults</div>
        <h2 className="hp-headline hp-anim-fade-up hp-anim-delay-1" style={{ textAlign: "center", margin: 0 }}>
          Put your stables to work.
        </h2>

        {/* Stable selector */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "var(--tc-surface)",
            border: "1px solid var(--tc-border)",
            borderRadius: "40px",
            padding: "6px 16px",
            fontSize: "12px",
            color: "var(--tc-text-muted)",
          }}
        >
          <span>Showing APYs for</span>
          <StableDropdown
            selected={selectedStable}
            onChange={(s) => setSelectedStable(s)}
          />
        </div>
      </div>

      <div className="hp-earn-grid">
        {Object.entries(EARN_PROVIDER_META).map(([protocol, meta], i) => {
          const data = yieldData?.[protocol] || { apy: FALLBACK_APYS[protocol] || 5, tvlUsd: 0 };
          return (
            <VaultCard
              key={protocol}
              protocol={protocol}
              label={meta.label}
              color={getProviderColor(protocol as EarnProvider)}
              apy={data.apy}
              tvl={data.tvlUsd > 0 ? formatTVL(data.tvlUsd) : "$252M"}
              delay={`${i * 100}ms`}
              loading={loading}
            />
          );
        })}
      </div>

      <div className="hp-settings-hint hp-anim-fade-up hp-anim-delay-4">
        <GearSix size={14} weight="bold" />
        <span>Switch vault providers anytime in Settings</span>
      </div>
    </section>
  );
}
