"use client";

import { useEffect, useRef, useState } from "react";

interface BuyProvider {
  name: string;
  url: string;
  icon?: string;
}

const AGGREGATORS: BuyProvider[] = [
  {
    name: "Jupiter",
    url: "https://jup.ag",
    icon: "https://jup.ag/favicon.ico",
  },
  { name: "Titan", url: "https://titanswap.org", icon: "" },
  { name: "DFlow", url: "https://dflow.net", icon: "" },
];

const POOLS: BuyProvider[] = [
  { name: "Orca", url: "https://orca.so", icon: "https://orca.so/favicon.ico" },
  {
    name: "Raydium",
    url: "https://raydium.io",
    icon: "https://raydium.io/favicon.ico",
  },
  { name: "Byreal", url: "https://byreal.io", icon: "" },
];

function ProviderIcon({ name, icon }: { name: string; icon?: string }) {
  const [err, setErr] = useState(false);
  if (icon && !err) {
    return (
      <img
        src={icon}
        alt={name}
        width={22}
        height={22}
        className="buy-provider__icon"
        onError={() => setErr(true)}
      />
    );
  }
  return (
    <div className="buy-provider__icon buy-provider__icon--fallback">
      {name.slice(0, 1)}
    </div>
  );
}

interface BuyButtonProps {
  tokenName?: string | null;
  tokenSymbol?: string | null;
}

export function BuyButton({ tokenName, tokenSymbol }: BuyButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    if (open) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const label = tokenName ? `Buy ${tokenName}` : "Buy";

  return (
    <div className="buy-wrap" ref={ref}>
      <button className="buy-btn" onClick={() => setOpen((o) => !o)}>
        {label}
        <svg
          viewBox="0 0 12 12"
          fill="none"
          width="11"
          height="11"
          className={`buy-btn__chevron ${open ? "buy-btn__chevron--open" : ""}`}
        >
          <path
            d="M2 4l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="buy-dropdown">
          {/* Aggregators */}
          <div className="buy-section">
            <div className="buy-section__label">
              <svg viewBox="0 0 14 14" fill="none" width="12" height="12">
                <path
                  d="M2 7h10M7 2l5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Aggregators
            </div>
            {AGGREGATORS.map((p) => (
              <a
                key={p.name}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="buy-provider"
              >
                <ProviderIcon name={p.name} icon={p.icon} />
                <span className="buy-provider__name">{p.name}</span>
                <svg
                  viewBox="0 0 12 12"
                  fill="none"
                  width="11"
                  height="11"
                  className="buy-provider__ext"
                >
                  <path
                    d="M2 10L10 2M10 2H4.5M10 2V7.5"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            ))}
          </div>

          {/* Individual Pools */}
          <div className="buy-section">
            <div className="buy-section__label">
              <svg viewBox="0 0 14 14" fill="none" width="12" height="12">
                <rect
                  x="1"
                  y="8"
                  width="3"
                  height="5"
                  rx="0.5"
                  fill="currentColor"
                />
                <rect
                  x="5.5"
                  y="5"
                  width="3"
                  height="8"
                  rx="0.5"
                  fill="currentColor"
                />
                <rect
                  x="10"
                  y="2"
                  width="3"
                  height="11"
                  rx="0.5"
                  fill="currentColor"
                />
              </svg>
              Individual Pools
            </div>
            {POOLS.map((p) => (
              <a
                key={p.name}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="buy-provider"
              >
                <ProviderIcon name={p.name} icon={p.icon} />
                <span className="buy-provider__name">{p.name}</span>
                <svg
                  viewBox="0 0 12 12"
                  fill="none"
                  width="11"
                  height="11"
                  className="buy-provider__ext"
                >
                  <path
                    d="M2 10L10 2M10 2H4.5M10 2V7.5"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
