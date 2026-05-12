"use client";

import { use, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useOHLCV, type OHLCVTimeframe } from "@/hooks/useOHLCV";
import {
  TokenAvatar,
  ChangeChip,
  fmtPrice,
  fmtCompact,
} from "@/components/TokenCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MarketsSection } from "@/components/Market";
import { SecuritySection } from "@/components/Secuirity";
import {
  VariantsSection,
  flattenVariantGroups,
  type VariantRow,
} from "@/components/Variant";
import { ExpandableDescription } from "@/components/ExpandableDescription";
import { VariantPicker } from "@/components/VariantPicker";
import type { TokenAssetResponse } from "@/types/token.types";
import type { MarketEntry } from "@/types/token.types";
import { tokenRequest } from "@/lib/token";
import type { AssetsResolveResponse } from "@/types";
import { useTokens } from "@/hooks/useToken";
import { SpotSwap } from "@/components/Swap/SpotSwap";
import { AddLiquidityCard } from "@/components/Liquidity/AddLiquidityCard";
import { useConnector, useWallet } from "@solana/connector";
import { ConnectedPill } from "@/components/Swap";
import { EarnVault } from "@/components/Earn/EarnVault";
import { NativeStakeCard } from "@/components/Staking/NativeStakeCard";
import { ChartControls, ChartType, OHLCVChart } from "@/components/ui/OhlcvChart";

function fmtPct(n: number | null | undefined) {
  if (n == null || isNaN(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function fmtVolTooltip(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

// ─── OHLCV Chart ──────────────────────────────────────────────────────────────

interface TooltipState {
  x: number;
  y: number;
  price: number;
  volume: number;
  time: number;
  visible: boolean;
}



// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div className="td-page">

      <div className="td-skel-page">
        <div className="td-skel-page__main">
          <div className="td-skel-row" style={{ marginBottom: 24 }}>
            <div
              className="td-skel td-skel--circle"
              style={{ width: 52, height: 52 }}
            />
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                className="td-skel td-skel--line"
                style={{ width: "40%", height: 22 }}
              />
              <div style={{ display: "flex", gap: 6 }}>
                <div
                  className="td-skel td-skel--line"
                  style={{ width: 70, height: 22, borderRadius: 20 }}
                />
                <div
                  className="td-skel td-skel--line"
                  style={{ width: 100, height: 22, borderRadius: 20 }}
                />
              </div>
            </div>
          </div>
          <div className="td-chart-section" style={{ marginBottom: 24 }}>
            <div className="td-chart td-chart--loading">
              <div className="td-chart__shimmer" />
            </div>
          </div>
          <div
            className="td-skel td-skel--line"
            style={{ width: 60, height: 18, marginBottom: 14 }}
          />
          <div className="td-stats-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="td-stat-cell">
                <div
                  className="td-skel td-skel--line"
                  style={{ width: "60%", height: 11, marginBottom: 6 }}
                />
                <div
                  className="td-skel td-skel--line"
                  style={{ width: "80%", height: 18 }}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="td-skel-page__side">
          <div
            className="td-skel td-skel--line"
            style={{
              width: "100%",
              height: 44,
              borderRadius: 22,
              marginBottom: 16,
            }}
          />
          <div className="td-card">
            <div
              className="td-skel td-skel--line"
              style={{ width: "50%", height: 14, marginBottom: 12 }}
            />
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="td-skel td-skel--line"
                style={{ height: 13, marginBottom: 8 }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar panel: swap ↔ add-liquidity ──────────────────────────────────────

/**
 * SidebarPanel
 * - When no market is active → shows SpotSwap (default)
 * - When a market is selected → shows AddLiquidityCard with a "← Back to Swap" header
 * Animate between the two with a fade/slide.
 */
function SidebarPanel({
  activeMarket,
  onCloseMarket,
  outputMint,
  outputSymbol,
  outputName,
  outputLogo,
}: {
  activeMarket: MarketEntry | null;
  onCloseMarket: () => void;
  outputMint: string;
  outputSymbol?: string;
  outputName: string;
  outputLogo?: string;
}) {
  if (activeMarket) {
    return (
      <div className="td-sidebar-panel" key={activeMarket.address}>
        {/* Back bar */}
        <button className="td-sidebar-back" onClick={onCloseMarket}>
          <svg viewBox="0 0 16 16" fill="none" width="12" height="12">
            <path
              d="M10 3L5 8l5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to Swap
        </button>
        <AddLiquidityCard market={activeMarket} onClose={onCloseMarket} />
      </div>
    );
  }

  return (
    <div className="td-sidebar-panel" key="swap">
      <SpotSwap
        outputMint={outputMint}
        outputSymbol={outputSymbol}
        outputName={outputName}
        outputLogo={outputLogo}
      />
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function TokenDetailPageContent({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  const { assetId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const mint = searchParams.get("mint");

  const { tokens } = useTokens();
  const { isConnected } = useWallet();
  const connector = useConnector();

  const [data, setData] = useState<TokenAssetResponse | null>(null);
  const [other, setOther] = useState<AssetsResolveResponse | null>(null);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [isLoadingPage, setLoading] = useState(true);

  // ── Sheet state (mobile) ──────────────────────────────────────────────────
  // "swap" | "liquidity" | null (closed)
  const [sheetMode, setSheetMode] = useState<"swap" | "liquidity" | "earn" | null>(null);
  const [chartType, setChartType] = useState<ChartType>("line");
  // ── Active liquidity market (shared between sidebar + sheet) ─────────────
  const [activeMarket, setActiveMarket] = useState<MarketEntry | null>(null);

  const fallbackToken = tokens.find((t) => t.assetId === assetId) ?? null;
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile(); // Initial check
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const {
    candles,
    isLoading: chartLoading,
    timeframe,
    setTimeframe,
  } = useOHLCV(assetId, mint);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const url = mint
          ? `/api/getVariant?assetId=${assetId}&mint=${mint}`
          : `/api/getToken?assetId=${assetId}`;

        const [res, otherData] = await Promise.all([
          fetch(url),
          tokenRequest.getAsset(assetId, true),
        ]);
        if (!res.ok) throw new Error(`Token API error: ${res.status}`);
        const json = await res.json();

        // Standardized structure is { asset, includes }
        const assetData: TokenAssetResponse = json.asset || json;

        if (!cancelled) {
          setData(assetData);
          setOther(otherData);
          setVariants(
            flattenVariantGroups(assetData.variantGroups, assetData.name, assetData.symbol),
          );
        }
      } catch (e) {
        if (!cancelled) setLoading(false);
        console.error("[TokenDetailPage] Failed to load:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [assetId, mint]);

  const profile = other?.includes?.profile?.data ?? null;
  const risk = other?.includes?.risk?.data ?? null;

  const activeVariant = useMemo(() => {
    if (!mint || !variants.length) return data?.primaryVariant ?? null;
    const found = variants.find((v) => v.mint === mint);
    if (!found) return data?.primaryVariant ?? null;
    return found;
  }, [mint, variants, data]);

  const { price, change24h, volume, liquidity, mcap, currentSymbol, currentMint, imageUrl } =
    useMemo(() => {
      const basePrice = profile?.price ?? data?.stats.price ?? null;
      const baseChange = profile?.priceChange24h ?? data?.stats.priceChange24hPercent ?? null;
      const baseVolume = profile?.volume24h ?? data?.stats.volume24hUSD ?? null;
      const baseLiquidity = data?.stats.liquidity ?? null;
      const baseMcap = profile?.marketCap ?? data?.stats.marketCap ?? null;

      if (!activeVariant || !data) {
        return {
          price: basePrice,
          change24h: baseChange,
          volume: baseVolume,
          liquidity: baseLiquidity,
          mcap: baseMcap,
          currentSymbol: data?.symbol ?? "",
          currentMint: data?.primaryVariant?.mint ?? null,
          imageUrl:
            data?.imageUrl ??
            data?.primaryVariant?.market?.logoURI ??
            fallbackToken?.imageUrl ??
            null,
        };
      }

      // If it's a VariantRow (from variants state)
      if ("variantId" in activeVariant && "price" in activeVariant) {
        return {
          price: activeVariant.price ?? basePrice,
          change24h: activeVariant.change24h ?? baseChange,
          volume: activeVariant.volume24h ?? baseVolume,
          liquidity: activeVariant.liquidity ?? baseLiquidity,
          mcap: activeVariant.marketCap ?? baseMcap,
          currentSymbol: activeVariant.symbol ?? data.symbol,
          currentMint: activeVariant.mint ?? null,
          imageUrl:
            activeVariant.logoURI ??
            data.imageUrl ??
            data.primaryVariant?.market?.logoURI ??
            fallbackToken?.imageUrl ??
            null,
        };
      }

      // If it's an AssetVariant (data.primaryVariant)
      const v = activeVariant;
      return {
        price: v.market?.price ?? basePrice,
        change24h: v.market?.priceChange24hPercent ?? baseChange,
        volume: v.market?.volume24hUSD ?? baseVolume,
        liquidity: v.market?.liquidity ?? baseLiquidity,
        mcap: v.market?.marketCap ?? baseMcap,
        currentSymbol: v.symbol ?? data.symbol,
        currentMint: v.mint ?? null,
        imageUrl:
          v.market?.logoURI ??
          data.imageUrl ??
          data.primaryVariant?.market?.logoURI ??
          fallbackToken?.imageUrl ??
          null,
      };
    }, [activeVariant, data, profile, fallbackToken]);

  const mintDisplay = currentMint
    ? `${currentMint.slice(0, 4)}…${currentMint.slice(-4)}`
    : null;

  const fdv = profile?.fdv ?? null;
  const supply = profile?.circulatingSupply ?? null;
  const totalSupply = profile?.totalSupply ?? null;
  const description = profile?.description ?? null;
  const website = profile?.links?.website ?? null;
  const twitter = profile?.links?.twitter ?? null;
  const reddit = profile?.links?.reddit ?? null;

  if (isLoadingPage || !data) {
    return <PageSkeleton onBack={() => router.back()} />;
  }

  const STABLE_SYMBOLS = [
    "USDC",
    "USD",
    "USDT",
    "USDG",
    "DAI",
    "USDS",
    "PYUSD",
    "FDUSD",
    "ZBC", // Adding some others that might have vaults
  ];
  const isStable = STABLE_SYMBOLS.includes(data.symbol?.toUpperCase() ?? "");
  const isNativeSOL =
    data.symbol?.toUpperCase() === "SOL" &&
    (!data.primaryVariant?.mint ||
      data.primaryVariant.mint === "So11111111111111111111111111111111111111112");

  // Show EarnVault for stables or SOL (lending)
  const showEarn = isStable || isNativeSOL;
  // Show NativeStake only for native SOL
  const showNativeStake = isNativeSOL;

  // Called from MarketsSection when user clicks "Add" on a row
  function handleAddLiquidity(market: MarketEntry) {
    // Toggle: same market → close
    if (activeMarket?.address === market.address) {
      setActiveMarket(null);
      // On mobile close any open sheet if it was showing liquidity
      setSheetMode((prev) => (prev === "liquidity" ? null : prev));
      return;
    }
    setActiveMarket(market);
    // On mobile, open the sheet in liquidity mode
    setSheetMode("liquidity");
  }

  function handleCloseMarket() {
    setActiveMarket(null);
    setSheetMode((prev) => (prev === "liquidity" ? null : prev));
  }

  // FAB label & click
  const fabLabel = activeMarket ? `Add Liquidity` : "Trade";

  function handleFabClick() {
    if (activeMarket) {
      setSheetMode("liquidity");
    } else {
      setSheetMode("swap");
    }
  }

  const sheetTitle =
    sheetMode === "liquidity" && activeMarket
      ? `Add Liquidity · ${activeMarket.base?.symbol ?? ""}/${activeMarket.quote?.symbol ?? ""}`
      : sheetMode === "earn"
        ? `Earn Yield · $${currentSymbol}`
        : currentSymbol
          ? `Trade $${currentSymbol}`
          : `Trade ${data.name}`;

  return (
    <div className="td-page">
      {/* Topbar */}
      <div className="td-topbar">
        <div className="td-topbar__left">
          <Link href="/" className="td-back" style={{ textDecoration: 'none' }}>
            Tokens
          </Link>
          <nav className="td-breadcrumb">
            <span className="td-breadcrumb__sep">›</span>
            {currentMint !== data.primaryVariant?.mint ? (
              <>
                <Link href={`/token/${assetId}`} className="td-breadcrumb__item">
                  {data.name}
                </Link>
                <span className="td-breadcrumb__sep">›</span>
                <span className="td-breadcrumb__item td-breadcrumb__item--mint">
                  ${currentSymbol}
                </span>
              </>
            ) : (
              <span className="td-breadcrumb__item">{data.name}</span>
            )}
          </nav>
        </div>
      </div>

      <div className="td-layout">
        {/* ── Main column ── */}
        <div className="td-main">
          {/* Header */}
          <div className="td-header">
            <TokenAvatar src={imageUrl} name={data.name} size={52} />
            <div className="td-header__info">
              <div className="td-header__row">
                <h1 className="td-header__name">{data.name ?? assetId}</h1>
                <svg
                  viewBox="0 0 16 16"
                  fill="none"
                  width="15"
                  height="15"
                  className="td-header__verified"
                >
                  <circle
                    cx="8"
                    cy="8"
                    r="8"
                    fill="var(--tc-badge-t1-c)"
                    opacity="0.15"
                  />
                  <circle
                    cx="8"
                    cy="8"
                    r="7"
                    stroke="var(--tc-badge-t1-c)"
                    strokeWidth="1"
                  />
                  <path
                    d="M5 8l2 2 4-4"
                    stroke="var(--tc-badge-t1-c)"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="td-header__pills">
                {currentSymbol && (
                  <span className="td-pill td-pill--sym">${currentSymbol}</span>
                )}
                {variants.length > 0 && (
                  <VariantPicker
                    variants={variants}
                    assetId={assetId}
                    currentMint={currentMint ?? undefined}
                  />
                )}
                {mintDisplay && (
                  <span className="td-pill td-pill--mint">
                    <svg viewBox="0 0 12 12" fill="none" width="10" height="10">
                      <rect
                        x="1"
                        y="1"
                        width="10"
                        height="10"
                        rx="2"
                        stroke="currentColor"
                        strokeWidth="1"
                      />
                      <path
                        d="M3.5 6h5M6 3.5v5"
                        stroke="currentColor"
                        strokeWidth="1"
                        strokeLinecap="round"
                      />
                    </svg>
                    {mintDisplay}
                  </span>
                )}
              </div>
            </div>
            <div className="td-header__actions">
              <button className="td-icon-btn" aria-label="Search">
                <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
                  <circle
                    cx="6.5"
                    cy="6.5"
                    r="4.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M10.5 10.5L14 14"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              {website && (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="td-icon-btn"
                  aria-label="Website"
                >
                  <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
                    <circle
                      cx="8"
                      cy="8"
                      r="6.5"
                      stroke="currentColor"
                      strokeWidth="1.2"
                    />
                    <path
                      d="M8 1.5C8 1.5 10.5 4 10.5 8s-2.5 6.5-2.5 6.5M8 1.5C8 1.5 5.5 4 5.5 8s2.5 6.5 2.5 6.5M1.5 8h13"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                  </svg>
                </a>
              )}
              {twitter && (
                <a
                  href={`https://x.com/${twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="td-icon-btn"
                  aria-label="Twitter / X"
                >
                  <svg
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    width="15"
                    height="15"
                  >
                    <path d="M12.6 2h2.2L9.9 7.3 15.6 14h-4.3l-3.5-4.5L3.7 14H1.5l5.3-5.7L1 2h4.4l3.2 4.1L12.6 2z" />
                  </svg>
                </a>
              )}
            </div>
          </div>

          {/* Chart */}
          <div className="td-chart-section">
            <div className="td-chart-label">
              <span className="td-chart-label__sym">{currentSymbol}</span>
              <span className="td-chart-label__text"> price is currently</span>
              <div className="td-chart-label__price">{fmtPrice(price)}</div>
              <ChangeChip value={change24h} />
              <span className="td-chart-label__period">{timeframe}</span>
            </div>
           <OHLCVChart candles={candles} isLoading={chartLoading} chartType={chartType} />
<ChartControls
  timeframe={timeframe}
  onTimeframe={setTimeframe}
  isLoading={chartLoading}
  chartType={chartType}
  onChartType={setChartType}        // ← new
/>
          </div>

          {/* Stats */}
          <section className="td-section">
            <h2 className="td-section__title">Stats</h2>
            <div className="td-stats-grid">
              {[
                { label: "Market Cap", value: fmtCompact(mcap) },
                { label: "Liquidity", value: fmtCompact(liquidity) },
                { label: "24H Volume", value: fmtCompact(volume) },
                {
                  label: "Supply",
                  value: supply ? `${(supply / 1e6).toFixed(2)}M` : "—",
                },
                { label: "Price", value: fmtPrice(price) },
                {
                  label: "24H Change",
                  value: fmtPct(change24h),
                  colored: true,
                  val: change24h,
                },
                { label: "FDV", value: fmtCompact(fdv) },
                {
                  label: "Total Supply",
                  value: totalSupply
                    ? `${(totalSupply / 1e6).toFixed(2)}M`
                    : "—",
                },
              ].map(({ label, value, colored, val }) => (
                <div key={label} className="td-stat-cell">
                  <span className="td-stat-cell__label">{label}</span>
                  <span
                    className={`td-stat-cell__value ${colored ? (val != null && val >= 0 ? "td-stat-cell__value--up" : "td-stat-cell__value--dn") : ""}`}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Markets — pass callback up */}
          {data.markets.length > 0 && (
            <MarketsSection
              markets={data.markets}
              total={data.marketsTotal}
              activeMarketAddress={activeMarket?.address ?? null}
              onAddLiquidity={handleAddLiquidity}
            />
          )}

          {risk && (
            <SecuritySection
              risk={risk}
              liquidity={liquidity}
              volume={volume}
              holders={null}
            />
          )}
          {variants.length > 0 && (
            <VariantsSection assetName={data.name} variants={variants} />
          )}
        </div>

        {/* ── Sidebar ── */}
        <aside className="td-sidebar ">
          <div className=" h-[36px] mb-[26px] bg-amber-0">
            {isConnected && (
              <div className="td-sidebar-pill">
                <ConnectedPill onDisconnect={() => connector.disconnect()} />
              </div>
            )}
          </div>

          {/* Desktop: sidebar panel swaps between Swap and AddLiquidity */}
          <div className=" td-swap-desktop-only">
            {activeMarket ? (
              <AddLiquidityCard
                market={activeMarket}
                onClose={handleCloseMarket}
              />
            ) : (
              <SpotSwap
                outputMint={currentMint ?? ""}
                outputSymbol={data.symbol}
                outputName={data.name}
                outputLogo={data.imageUrl ?? undefined}
              />
            )}
          </div>

          {/* Yield Opportunities Section — Desktop Only */}
          {!isMobile && (showNativeStake || showEarn) && (
            <div className="mt-6 flex flex-col gap-6">
              {showNativeStake && <NativeStakeCard />}
              {showEarn && <EarnVault mint={currentMint} symbol={currentSymbol} />}
            </div>
          )}

          {/* Mobile FAB — label changes based on context */}
          {isMobile && sheetMode === null && (
            <div className="td-fab-container">
              <button className="td-trade-fab" onClick={handleFabClick}>
                {activeMarket ? (
                  <>
                    <svg viewBox="0 0 14 14" fill="none" width="13" height="13">
                      <path
                        d="M7 1v12M1 7h12"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                    Add Liquidity
                  </>
                ) : (
                  "Trade"
                )}
              </button>
              {showEarn && !activeMarket && (
                <button 
                  className="td-trade-fab td-trade-fab--earn" 
                  onClick={() => setSheetMode("earn")}
                >
                  Earn
                </button>
              )}
            </div>
          )}

          {/* Mobile Bottom Sheet */}
          {isMobile && sheetMode !== null && (
            <>
              <div
                className="td-swap-sheet-backdrop"
                onClick={() => setSheetMode(null)}
              />
              <div className="td-swap-sheet">
                <div className="td-swap-sheet__header">
                  <span className="td-swap-sheet__title">
                    {sheetTitle + "hre"}
                  </span>
                  <button
                    className="td-swap-sheet__close"
                    onClick={() => setSheetMode(null)}
                    aria-label="Close"
                  >
                    <svg viewBox="0 0 14 14" fill="none" width="12" height="12">
                      <path
                        d="M2 2l10 10M12 2L2 12"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>
                <div className="td-swap-sheet__body ">
                  {sheetMode === "liquidity" && activeMarket ? (
                    <AddLiquidityCard
                      market={activeMarket}
                      onClose={() => setSheetMode(null)}
                    />
                  ) : sheetMode === "earn" ? (
                    <div className="flex flex-col gap-4 pb-8">
                      {showNativeStake && <NativeStakeCard />}
                      {showEarn && <EarnVault mint={currentMint} symbol={currentSymbol} />}
                    </div>
                  ) : (
                    <SpotSwap
                      outputMint={currentMint ?? ""}
                      outputSymbol={data.symbol}
                      outputName={data.name}
                      outputLogo={data.imageUrl ?? undefined}
                    />
                  )}
                </div>
              </div>
            </>
          )}

          {description && (
            <ExpandableDescription
              text={description}
              tokenName={data.name}
              maxChars={220}
            />
          )}

          {(website || twitter || reddit) && (
            <div className="td-card">
              <h3 className="td-card__title">Official links</h3>
              <div className="td-links">
                {website && (
                  <a
                    href={website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="td-link"
                  >
                    Website
                  </a>
                )}
                {reddit && (
                  <a
                    href={`https://reddit.com/r/${reddit}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="td-link"
                  >
                    Reddit
                  </a>
                )}
                {twitter && (
                  <a
                    href={`https://x.com/${twitter}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="td-link"
                  >
                    <svg
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      width="11"
                      height="11"
                    >
                      <path d="M12.6 2h2.2L9.9 7.3 15.6 14h-4.3l-3.5-4.5L3.7 14H1.5l5.3-5.7L1 2h4.4l3.2 4.1L12.6 2z" />
                    </svg>
                    X
                  </a>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default function TokenDetailPage(props: {
  params: Promise<{ assetId: string }>;
}) {
  return (
    <Suspense fallback={<PageSkeleton onBack={() => {}} />}>
      <TokenDetailPageContent {...props} />
    </Suspense>
  );
}
