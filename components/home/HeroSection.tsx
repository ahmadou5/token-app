"use client";

import React, { Suspense, lazy, useEffect, useState } from "react";
import Link from "next/link";
import Logo from '@/assets/logo.svg'
const Spline = lazy(() => import("@splinetool/react-spline"));

interface Stats {
  tvl: string;
  volume24h: string;
  activeUsers: string;
}

interface StatsResponse {
  ok: boolean;
  data: Stats;
  err: string | null;
}

export function HeroSection() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showScroll, setShowScroll] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/home/stats");
        const data = (await res.json()) as StatsResponse;
        setStats(data.data);
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();

    const handleScroll = () => {
      if (window.scrollY > 100) {
        setShowScroll(false);
      } else {
        setShowScroll(true);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="hp-hero">
      {/* Background Spline Scene */}
     

      <div className="hp-hero__content">
        <div className="hp-label hp-anim-fade-up">
          <img 
            src={typeof Logo === 'string' ? Logo : (Logo as any).src} 
            className="h-auto w-[280px] md:w-[420px] object-contain"
            alt="Logo"
          />
        </div>
        <span className="hp-label hp-anim-fade-up">
          The Everything DeFi App on Solana
        </span>

        <h1 className="hp-display">
          <span className="hp-anim-fade-up hp-anim-delay-1" style={{ display: 'inline-block', marginRight: '0.2em' }}>Trade.</span>
          <span className="hp-anim-fade-up hp-anim-delay-2" style={{ display: 'inline-block', marginRight: '0.2em' }}>Earn.</span>
          <br />
          <span className="hp-anim-fade-up hp-anim-delay-3" style={{ display: 'inline-block', marginRight: '0.2em' }}>Stake.</span>
          <span className="hp-anim-fade-up hp-anim-delay-4" style={{ display: 'inline-block' }}>All in one.</span>
        </h1>

        <p className="hp-subhead hp-anim-fade-up hp-anim-delay-5" style={{ maxWidth: '600px' }}>
          Spot trading, perpetuals, yield vaults and native SOL staking — unified.
        </p>

        <div className="hp-hero__stats hp-anim-fade-up hp-anim-delay-6">
          <div className="hp-stat-chip">
            <span className="hp-label">TVL</span>
            <span className={`hp-stat-chip__value ${isLoading ? 'hp-skeleton' : ''}`} style={{ minWidth: isLoading ? '60px' : 'auto', minHeight: '28px' }}>
              {isLoading ? "" : `$${stats?.tvl}`}
            </span>
          </div>
          <div className="hp-stat-chip">
            <span className="hp-label">24h Volume</span>
            <span className={`hp-stat-chip__value ${isLoading ? 'hp-skeleton' : ''}`} style={{ minWidth: isLoading ? '60px' : 'auto', minHeight: '28px' }}>
              {isLoading ? "" : `$${stats?.volume24h}`}
            </span>
          </div>
          <div className="hp-stat-chip">
            <span className="hp-label">Active Users</span>
            <span className={`hp-stat-chip__value ${isLoading ? 'hp-skeleton' : ''}`} style={{ minWidth: isLoading ? '60px' : 'auto', minHeight: '28px' }}>
              {isLoading ? "" : stats?.activeUsers}
            </span>
          </div>
        </div>

        <div className="hp-hero__ctas hp-anim-fade-up hp-anim-delay-6" style={{ marginTop: '12px' }}>
          <Link href="/markets" className="tg-btn-primary tg-btn-lg flex items-center justify-center text-center">
            Enter App
          </Link>
          <a href="#trading" className="tg-btn-secondary tg-btn-lg flex items-center justify-center text-center" onClick={(e) => {
            e.preventDefault();
            document.querySelector('#trading')?.scrollIntoView({ behavior: 'smooth' });
          }}>
            Learn more
          </a>
        </div>
      </div>

      {showScroll && (
        <div 
          className="hp-hero__scroll-hint"
          onClick={() => document.querySelector('#trading')?.scrollIntoView({ behavior: 'smooth' })}
        >
          <svg viewBox="0 0 24 24" fill="none" width="32" height="32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 13l5 5 5-5M7 6l5 5 5-5" />
          </svg>
        </div>
      )}
    </section>
  );
}
