"use client";

import Link from "next/link";
import { TwitterLogo, GithubLogo } from "@phosphor-icons/react";
import Logo from "@/assets/vela.png";

export function HomeFooter() {
  return (
    <footer className="hp-footer-wrapper">
      <div className="hp-footer">
        <div className="hp-footer__row">
          <Link href="/" className="hp-nav__logo">
          <img src={typeof Logo === 'string' ? Logo : (Logo as any).src} alt="VELA" className="h-12 w-12" />
            <span className="hp-nav__logo-text" style={{ fontSize: '18px' }}>Vela</span>
          </Link>

          <nav style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link href="/markets" className="hp-nav__link">Markets</Link>
            <Link href="/token/sol" className="hp-nav__link">Trade</Link>
            <Link href="/token/sol" className="hp-nav__link">Earn</Link>
            <Link href="/token/sol" className="hp-nav__link">Stake</Link>
            <Link href="/validators" className="hp-nav__link">Validators</Link>
          </nav>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '6px 12px', 
            background: 'var(--tc-bg-muted)', 
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--tc-text-secondary)',
            border: '1px solid var(--tc-border)'
          }}>
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M11.96 0c.34 0 .66.14.9.39l10.74 10.74c.4.4.52 1.01.27 1.5l-3.32 6.64a1.27 1.27 0 01-.9 1.13l-6.64 3.32c-.5.25-1.1.13-1.5-.27L.81 12.71a1.27 1.27 0 01-.27-1.5l3.32-6.64A1.27 1.27 0 014.76.81l6.64-3.32c.5-.25 1.1-.13 1.5.27l1.06 1.06z" />
            </svg>
            Built on Solana
          </div>
        </div>

        <div className="hp-footer__row" style={{ paddingTop: '32px', borderTop: '1px solid var(--tc-divider)' }}>
          <div style={{ fontSize: '12px', color: 'var(--tc-text-muted)' }}>
            © 2026 Vela. Not financial advice.
          </div>
          
          <div style={{ display: 'flex', gap: '16px' }}>
            <a href="https://twitter.com/4hamdou_5" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--tc-text-muted)', transition: 'color 160ms' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--tc-text-primary)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--tc-text-muted)'}>
              <TwitterLogo size={20} weight="fill" />
            </a>
            <a href="https://github.com/ahmadou5/token-app" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--tc-text-muted)', transition: 'color 160ms' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--tc-text-primary)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--tc-text-muted)'}>
              <GithubLogo size={20} weight="fill" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
