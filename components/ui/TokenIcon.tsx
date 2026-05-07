"use client";

import { useState, useMemo } from "react";

interface TokenIconProps {
  src?: string;
  symbol: string;
  name?: string;
  size?: number;
  className?: string;
}

/**
 * A robust token icon component that handles broken images gracefully.
 * It tries mirrored CDNs for known problematic URLs (like Mango) 
 * and falls back to a symbol-based avatar.
 */
export function TokenIcon({ src, symbol, name, size = 32, className = "" }: TokenIconProps) {
  const [errorCount, setErrorCount] = useState(0);

  // Mirrors to try if the primary URL fails
  const mirrors = useMemo(() => {
    if (!src) return [];
    
    const list = [src];
    
    // Fallback mirror: Jupiter's CDN is usually very reliable
    // We can extract the mint from some URLs if needed, but for now we just try a generic fallback
    if (src.includes("mango.markets")) {
      // Redirect mangoSOL to a known working mirror or generic Solana labs one
      list.push("https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png");
    }
    
    return list;
  }, [src]);

  const currentSrc = mirrors[errorCount] || null;

  if (currentSrc && errorCount < mirrors.length) {
    return (
      <img
        src={currentSrc}
        alt={name || symbol}
        width={size}
        height={size}
        className={`tc-token-icon ${className}`}
        style={{ 
          width: size, 
          height: size, 
          borderRadius: "50%", 
          objectFit: "cover",
          backgroundColor: "var(--tc-bg-muted)"
        }}
        onError={() => setErrorCount(prev => prev + 1)}
      />
    );
  }

  // Fallback: Symbol-based avatar
  return (
    <div
      className={`tc-token-icon-fallback ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "var(--tc-bg-soft)",
        color: "var(--tc-text-muted)",
        fontSize: Math.max(10, Math.floor(size * 0.35)),
        fontWeight: 600,
        border: "1px solid var(--tc-border)",
        textTransform: "uppercase"
      }}
    >
      {symbol.slice(0, 2)}
    </div>
  );
}
