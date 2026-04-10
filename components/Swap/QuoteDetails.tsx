"use client";

import {
  PROVIDER_META,
  type SwapProvider,
} from "@/context/SwapSettingsContext";
import { TokenOption } from "./constants";

interface QuoteDetailsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  quote: any;
  outputToken: TokenOption;
  slippage: number;
}

function fmt(n: number) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toFixed(6).replace(/\.?0+$/, "");
}

export function QuoteDetails({
  quote,
  outputToken,
  slippage,
}: QuoteDetailsProps) {
  const outDecimals =
    outputToken.symbol === "USDC" || outputToken.symbol === "USDT" ? 6 : 9;
  const outNum = Number(quote.outputAmount) / 10 ** outDecimals;
  const minOut = outNum * (1 - slippage / 100);
  const providerMeta = PROVIDER_META[quote.provider as SwapProvider];

  return (
    <div className="sw-quote">
      <div className="sw-quote__row">
        <span className="sw-quote__label">Min received</span>
        <span className="sw-quote__val">
          {fmt(minOut)} {outputToken.symbol}
        </span>
      </div>

      <div className="sw-quote__row">
        <span className="sw-quote__label">Price impact</span>
        <span
          className={`sw-quote__val ${quote.priceImpact > 2 ? "sw-quote__val--warn" : ""}`}
        >
          {quote.priceImpact.toFixed(2)}%
        </span>
      </div>

      <div className="sw-quote__row">
        <span className="sw-quote__label">Fee</span>
        <span className="sw-quote__val">{(quote.fee * 100).toFixed(2)}%</span>
      </div>

      {quote.route.length > 0 && (
        <div className="sw-quote__row">
          <span className="sw-quote__label">Route</span>
          <span className="sw-quote__val sw-quote__val--route">
            {quote.route.join(" → ")}
          </span>
        </div>
      )}

      <div className="sw-quote__row sw-quote__row--provider">
        <span className="sw-quote__label">Via</span>
        <span className="sw-quote__provider">
          {providerMeta.label}
          {providerMeta.badge && (
            <span className="sw-quote__provider-badge">
              {providerMeta.badge}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
