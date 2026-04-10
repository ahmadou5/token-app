"use client";

import { useEffect, useRef, useState } from "react";
import { TokenLogo } from "./TokenLogo";
import type { TokenOption } from "./constants";

interface TokenSelectProps {
  value: TokenOption;
  options: TokenOption[];
  onChange: (t: TokenOption) => void;
  excludeMint?: string;
}

export function TokenSelect({
  value,
  options,
  onChange,
  excludeMint,
}: TokenSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="sw-token-select" ref={ref}>
      <button className="sw-token-trigger" onClick={() => setOpen((o) => !o)}>
        <TokenLogo logo={value.logo} symbol={value.symbol} size={18} />
        <span className="sw-token-trigger__sym">{value.symbol}</span>
        <svg
          viewBox="0 0 10 6"
          fill="none"
          width="9"
          height="9"
          className={`sw-chev ${open ? "sw-chev--open" : ""}`}
        >
          <path
            d="M1 1l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="sw-token-dropdown">
          {options
            .filter((t) => t.mint !== excludeMint)
            .map((t) => (
              <button
                key={t.mint}
                className={`sw-token-option ${t.mint === value.mint ? "sw-token-option--active" : ""}`}
                onClick={() => {
                  onChange(t);
                  setOpen(false);
                }}
              >
                <TokenLogo logo={t.logo} symbol={t.symbol} size={18} />
                <div className="sw-token-option__text">
                  <span className="sw-token-option__sym">{t.symbol}</span>
                  <span className="sw-token-option__name">{t.name}</span>
                </div>
                {t.mint === value.mint && (
                  <svg viewBox="0 0 12 12" fill="none" width="11" height="11">
                    <path
                      d="M2 6l3 3 5-5"
                      stroke="var(--tc-accent)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
