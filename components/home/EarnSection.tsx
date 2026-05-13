"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { GearSix, CheckCircle, CaretDown } from "@phosphor-icons/react";
import Link from "next/link";
import { EARN_PROVIDER_META, EarnProvider } from "@/context/SwapSettingsContext";
import { getProviderColor, PROVIDER_ICONS } from "@/lib/yieldPrivider";

// ─── Active providers (drift excluded — paused) ───────────────────────────────
const ACTIVE_PROVIDERS: EarnProvider[] = ["kamino", "marginfi", "jupiter"];

// ─── Stable type ──────────────────────────────────────────────────────────────
interface StableOption {
  symbol: string;
  logo: string | null;
  mint?: string;
}

// ─── Fallback stables (used while the API loads) ──────────────────────────────
const FALLBACK_STABLES: StableOption[] = [
  {
    symbol: "USDC",
    logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  {
    symbol: "USDT",
    logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png",
    mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
  },
];

// ─── Stable logo avatar ───────────────────────────────────────────────────────
function StableLogo({ src, symbol, size = 18 }: { src: string | null; symbol: string; size?: number }) {
  const [err, setErr] = useState(false);

  if (!src || err) {
    return (
      <span
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "var(--tc-bg-muted)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 8,
          fontWeight: 700,
          color: "var(--tc-text-muted)",
          flexShrink: 0,
        }}
      >
        {symbol.slice(0, 1)}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={symbol}
      width={size}
      height={size}
      style={{ borderRadius: "50%", flexShrink: 0, display: "block" }}
      onError={() => setErr(true)}
    />
  );
}

// ─── Portal dropdown — escapes overflow:hidden ancestors ──────────────────────
function StableDropdown({
  selected,
  stables,
  onChange,
}: {
  selected: StableOption;
  stables: StableOption[];
  onChange: (s: StableOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  function openDropdown() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 6, left: r.left + r.width / 2 });
    }
    setOpen(true);
  }

  // Close when clicking outside BOTH the trigger button AND the dropdown panel
  useEffect(() => {
    if (!open) return;

    function onMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      const insideBtn = btnRef.current?.contains(target) ?? false;
      const insideDrop = dropRef.current?.contains(target) ?? false;
      if (!insideBtn && !insideDrop) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        className="hp-stable-btn"
        onClick={() => (open ? setOpen(false) : openDropdown())}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <StableLogo src={selected.logo} symbol={selected.symbol} size={16} />
        <span className="hp-stable-btn__label">{selected.symbol}</span>
        <CaretDown
          size={10}
          weight="bold"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 160ms",
            flexShrink: 0,
          }}
        />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={dropRef}
            role="listbox"
            className="hp-stable-dropdown"
            style={{
              top: pos.top,
              left: pos.left,
              transform: "translateX(-50%)",
            }}
          >
            {stables.map((s) => {
              const active = selected.symbol === s.symbol;
              return (
                <button
                  key={s.symbol}
                  role="option"
                  aria-selected={active}
                  data-symbol={s.symbol}
                  className={`hp-stable-option ${active ? "hp-stable-option--active" : ""}`}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onChange(s);
                    setOpen(false);
                  }}
                >
                  <StableLogo src={s.logo} symbol={s.symbol} size={18} />
                  <span className="hp-stable-option__sym">{s.symbol}</span>
                  {active && (
                    <CheckCircle
                      size={10}
                      weight="fill"
                      style={{
                        color: "var(--tc-accent)",
                        position: "absolute",
                        top: -2,
                        right: -2,
                        background: "var(--tc-bg)",
                        borderRadius: "50%",
                      }}
                      className="hp-mobile-hide"
                    />
                  )}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </>
  );
}

// ─── Vault card ───────────────────────────────────────────────────────────────
interface VaultProps {
  protocol: EarnProvider;
  color: string;
  label: string;
  apy: number;
  tvl: string;
  delay: string;
  loading: boolean;
  mint: string;
}

function VaultCard({ protocol, color, apy, tvl, delay, label, loading, mint }: VaultProps) {
  const [displayApy, setDisplayApy] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const prevApyRef = useRef(apy);

  const animateApy = useCallback((from: number, to: number) => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    const duration = 900;
    const startTime = performance.now();
    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(2, -10 * progress);
      setDisplayApy(from + (to - from) * ease);
      if (progress < 1) rafRef.current = requestAnimationFrame(update);
      else setDisplayApy(to);
    };
    rafRef.current = requestAnimationFrame(update);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          animateApy(0, apy);
          prevApyRef.current = apy;
        }
      },
      { threshold: 0.2 }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAnimated]);

  useEffect(() => {
    if (hasAnimated && prevApyRef.current !== apy) {
      animateApy(prevApyRef.current, apy);
      prevApyRef.current = apy;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apy, hasAnimated]);

  return (
    <div
      ref={cardRef}
      className="hp-earn-card hp-anim-scale-in"
      style={{ animationDelay: delay }}
    >
      <div className="hp-earn-card__header">
        <div className="hp-earn-card__logo">
          <img className="w-full h-full rounded-xl" src={PROVIDER_ICONS[protocol]} alt={protocol} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontWeight: 700 }}>{label}</span>
            <CheckCircle size={14} weight="fill" style={{ color: "var(--tc-accent)" }} />
          </div>
          <span className="hp-label" style={{ fontSize: 9 }}>Verified</span>
        </div>
      </div>

      <div>
        {loading ? (
          <div
            style={{
              height: 52,
              width: 100,
              borderRadius: 8,
              background:
                "linear-gradient(90deg,var(--tc-bg-muted) 25%,var(--tc-border) 50%,var(--tc-bg-muted) 75%)",
              backgroundSize: "200% 100%",
              animation: "hpShimmer 1.5s infinite",
            }}
          />
        ) : apy > 0 ? (
          <>
            <div className="hp-earn-card__apy">
              {displayApy.toFixed(1)}
              <span className="hp-earn-card__apy-sign">%</span>
            </div>
            <div className="hp-label">Current APY</div>
          </>
        ) : (
          <>
            <div className="hp-earn-card__apy" style={{ fontSize: 28, color: "var(--tc-text-muted)" }}>
              —
            </div>
            <div className="hp-label">No pool data</div>
          </>
        )}
      </div>

      <div className="hp-earn-card__stats">
        <div className="hp-earn-card__stat">
          <span className="hp-label" style={{ fontSize: 9 }}>TVL</span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{tvl}</span>
        </div>
        <div className="hp-earn-card__stat">
          <span className="hp-label" style={{ fontSize: 9 }}>Status</span>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Active</span>
        </div>
      </div>

      <Link
        href={`/token/usd?mint=${mint}`}
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

  // Stables pulled from the USD asset variants
  const [stables, setStables] = useState<StableOption[]>(FALLBACK_STABLES);
  const [selected, setSelected] = useState<StableOption>(FALLBACK_STABLES[0]);

  // Yield data
  const [yieldData, setYieldData] = useState<Record<string, { apy: number; tvlUsd: number }> | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Fetch USD spot variants from the app's own API ─────────────────────────
  useEffect(() => {
    fetch("/api/getVariant?assetId=usd")
      .then((r) => r.json())
      .then((data) => {
        // Spot variants come from variantGroups.spot
        const spotVariants: any[] =
          data?.asset?.variantGroups?.spot ?? [];

        if (spotVariants.length === 0) return; // keep fallbacks

        const options: StableOption[] = spotVariants
          .filter((v: any) => v.symbol && v.mint)
          .map((v: any) => ({
            symbol: (v.symbol as string).toUpperCase(),
            logo: v.market?.logoURI ?? null,
            mint: v.mint as string,
          }))
          // Deduplicate by symbol
          .filter(
            (v: StableOption, idx: number, arr: StableOption[]) =>
              arr.findIndex((x) => x.symbol === v.symbol) === idx
          );

        if (options.length > 0) {
          setStables(options);
          setSelected(options[0]);
        }
      })
      .catch(() => {}); // silently keep fallbacks on error
  }, []);

  // ── Fetch yields whenever selected stable changes ─────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`/api/yield/quote/all?symbol=${selected.symbol}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.apyMap) setYieldData(data.apyMap);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [selected.symbol]);

  // ── Section visibility ────────────────────────────────────────────────────
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setIsVisible(true); },
      { threshold: 0.2 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const formatTVL = (usd: number) => {
    if (usd <= 0) return "—";
    if (usd >= 1e9) return `$${(usd / 1e9).toFixed(1)}B`;
    if (usd >= 1e6) return `$${(usd / 1e6).toFixed(1)}M`;
    if (usd >= 1e3) return `$${(usd / 1e3).toFixed(0)}K`;
    return `$${usd.toFixed(0)}`;
  };

  return (
    <section
      id="earn"
      ref={sectionRef}
      className={`hp-section hp-earn-section ${isVisible ? "hp-is-visible" : ""} rounded-2xl`}
    >
      {/* Blur decorations — isolated so they don't clip the portal dropdown */}
      <div className="hp-earn-section__blurs" aria-hidden>
        <div
          className="hp-blur-circle"
          style={{ width: 400, height: 400, background: "rgba(153,69,255,0.06)", top: -100, left: -100, animation: "hpFloat 8s ease-in-out infinite" }}
        />
        <div
          className="hp-blur-circle"
          style={{ width: 300, height: 300, background: "rgba(99,153,255,0.05)", top: "50%", left: "50%", transform: "translate(-50%,-50%)", animation: "hpFloat 10s ease-in-out infinite", animationDelay: "2s" }}
        />
        <div
          className="hp-blur-circle"
          style={{ width: 350, height: 350, background: "rgba(74,222,128,0.05)", bottom: -100, right: -100, animation: "hpFloat 12s ease-in-out infinite", animationDelay: "4s" }}
        />
      </div>

      {/* Header */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          textAlign: "center",
          marginBottom: 48,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
        }}
      >
        <div className="hp-label hp-anim-fade-up">Yield Vaults</div>
        <h2
          className="hp-headline hp-anim-fade-up hp-anim-delay-1"
          style={{ margin: 0, textAlign: "center" }}
        >
          Put your stables to work.
        </h2>

        {/* Stable switcher pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "var(--tc-surface)",
            border: "1px solid var(--tc-border)",
            borderRadius: 40,
            padding: "6px 16px",
            fontSize: 12,
            color: "var(--tc-text-muted)",
          }}
        >
          <span>Showing APYs for</span>
          <StableDropdown
            selected={selected}
            stables={stables}
            onChange={setSelected}
          />
        </div>
      </div>

      {/* Cards grid */}
      <div className="hp-earn-grid" style={{ position: "relative", zIndex: 1 }}>
        {ACTIVE_PROVIDERS.map((protocol, i) => {
          const meta = EARN_PROVIDER_META[protocol];
          const data = yieldData?.[protocol] || { apy: 0, tvlUsd: 0 };
          return (
            <VaultCard
              key={protocol}
              protocol={protocol}
              label={meta.label}
              color={getProviderColor(protocol)}
              apy={data.apy}
              tvl={formatTVL(data.tvlUsd)}
              delay={`${i * 100}ms`}
              loading={loading}
              mint={selected.mint || "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"}
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
