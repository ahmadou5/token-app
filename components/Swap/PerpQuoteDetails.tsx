"use client";

import type { PerpQuote } from "@/hooks/usePerpQuote";

function fmtUsd(n: number | null | undefined) {
  if (n == null || isNaN(n)) return "—";
  return `$${Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtPrice(n: number | null | undefined) {
  if (n == null || isNaN(n)) return "—";
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

interface PerpQuoteDetailsProps {
  quote: PerpQuote;
  positionSize: number; // collateral × leverage
  side: "long" | "short";
}

export function PerpQuoteDetails({
  quote,
  positionSize,
  side,
}: PerpQuoteDetailsProps) {
  const rows = [
    {
      label: "Position Size",
      value: fmtUsd(positionSize),
    },
    {
      label: "Entry Price",
      value: fmtPrice(quote.entryPrice),
    },
    {
      label: "Liq. Price",
      value: fmtPrice(quote.liquidationPrice),
      danger: true,
    },
    {
      label: "Fee",
      value: fmtUsd(quote.fee),
    },
    ...(quote.takeProfit
      ? [
          {
            label: "Take Profit",
            value: fmtPrice(quote.takeProfit),
            success: true,
          },
        ]
      : []),
    ...(quote.stopLoss
      ? [{ label: "Stop Loss", value: fmtPrice(quote.stopLoss), danger: true }]
      : []),
  ];

  return (
    <div className="sw-perp-quote">
      {rows.map((row) => (
        <div key={row.label} className="sw-perp-quote__row">
          <span className="sw-perp-quote__label">{row.label}</span>
          <span
            className={`sw-perp-quote__value ${
              row.danger
                ? "sw-perp-quote__value--danger"
                : row.success
                  ? "sw-perp-quote__value--success"
                  : ""
            }`}
          >
            {row.value}
          </span>
        </div>
      ))}

      {/* Direction indicator */}
      <div className="sw-perp-quote__row sw-perp-quote__row--footer">
        <span className="sw-perp-quote__label">Direction</span>
        <span
          className={`sw-perp-quote__dir ${
            side === "long"
              ? "sw-perp-quote__dir--long"
              : "sw-perp-quote__dir--short"
          }`}
        >
          {side === "long" ? "▲ Long" : "▼ Short"}
        </span>
      </div>
    </div>
  );
}
