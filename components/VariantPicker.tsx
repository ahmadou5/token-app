"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fmtCompact } from "@/components/TokenCard";
import type { VariantRow } from "@/components/Variant";

interface VariantPickerProps {
  currentMint?: string;
  variants: VariantRow[];
  assetId: string;
}

function VariantGroup({
  title,
  rows,
  onSelect,
}: {
  title: string;
  rows: VariantRow[];
  onSelect: (row: VariantRow) => void;
}) {
  if (!rows.length) return null;
  return (
    <div className="vpick-group">
      <div className="vpick-group__label">{title}</div>
      {rows.map((row, i) => {
        const initials = row.symbol?.slice(0, 2).toUpperCase() ?? "??";
        return (
          <div
            key={`${row.mint}-${i}`}
            className="vpick-row"
            onClick={() => onSelect(row)}
          >
            <div className="vpick-row__avatar">
              {row.logoURI ? (
                <img
                  src={row.logoURI}
                  alt={row.symbol}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    if (e.currentTarget.parentElement)
                      e.currentTarget.parentElement.textContent = initials;
                  }}
                />
              ) : (
                initials
              )}
            </div>
            <div className="vpick-row__info">
              <span className="vpick-row__name">{row.name || row.symbol}</span>
              <span className="vpick-row__sym">${row.symbol}</span>
            </div>
            <div className="vpick-row__liq">{fmtCompact(row.liquidity)}</div>
            <svg
              viewBox="0 0 12 12"
              fill="none"
              width="12"
              height="12"
              className="vpick-row__arrow"
            >
              <path
                d="M4 2l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        );
      })}
    </div>
  );
}

export function VariantPicker({
  currentMint,
  variants,
  assetId,
}: VariantPickerProps) {
  const router = useRouter();
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

  const spotRows = variants.filter(
    (v) =>
      v.kind !== "yield" &&
      !v.tags?.includes("yield") &&
      !v.tags?.includes("lst"),
  );
  const yieldRows = variants.filter(
    (v) =>
      v.kind === "yield" ||
      v.tags?.includes("yield") ||
      v.tags?.includes("lst"),
  );
  const count = variants.length;
  const label = count > 1 ? `${count}+ VARIANTS` : "VARIANTS";

  function handleSelect(row: VariantRow) {
    setOpen(false);
    // Navigate to same asset with mint param
    router.push(`/token/${assetId}?mint=${row.mint}`);
  }

  return (
    <div className="vpick" ref={ref}>
      <button className="vpick-trigger" onClick={() => setOpen((o) => !o)}>
        {label}
        <svg
          viewBox="0 0 10 6"
          fill="none"
          width="9"
          height="9"
          className={`vpick-trigger__chevron ${open ? "vpick-trigger__chevron--open" : ""}`}
        >
          <path
            d="M1 1l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="vpick-dropdown">
          <div className="vpick-dropdown__header">
            <span className="vpick-dropdown__title">Variants</span>
            <span className="vpick-dropdown__sub">Liquidity</span>
          </div>
          <div className="vpick-dropdown__list">
            <VariantGroup
              title="Native"
              rows={spotRows}
              onSelect={handleSelect}
            />
            <VariantGroup
              title="Yield-bearing"
              rows={yieldRows}
              onSelect={handleSelect}
            />
          </div>
        </div>
      )}
    </div>
  );
}
