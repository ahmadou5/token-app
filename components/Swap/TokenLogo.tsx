"use client";

import { useState } from "react";

interface TokenLogoProps {
  logo?: string;
  symbol: string;
  size?: number;
}

export function TokenLogo({ logo, symbol, size = 24 }: TokenLogoProps) {
  const [err, setErr] = useState(false);

  if (logo && !err) {
    return (
      <img
        src={logo}
        alt={symbol}
        width={size}
        height={size}
        className="sw-token-logo"
        onError={() => setErr(true)}
      />
    );
  }

  return (
    <div
      className="sw-token-logo sw-token-logo--fallback"
      style={{ width: size, height: size }}
    >
      {symbol.slice(0, 2)}
    </div>
  );
}
