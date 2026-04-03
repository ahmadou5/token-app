"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fmtCompact } from "@/components/TokenCard";
import type { VariantRow } from "@/components/Variant";

function safe(str: string | null | undefined, fallback = "") {
  return str && typeof str === "string" ? str : fallback;
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
        const sym = safe(row?.symbol, "?");
        const name = safe(row?.name, sym) || sym;
        const initials = sym.slice(0, 2).toUpperCase() || "??";
        const logoURI = row?.logoURI;

        return (
          <div
            key={`${safe(row?.mint)}-${i}`}
            className="vpick-row"
            onClick={() => onSelect(row)}
          >
            <div className="vpick-row__avatar">
              {logoURI && typeof logoURI === "string" ? (
                <img
                  src={logoURI}
                  alt={sym}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    const p = e.currentTarget.parentElement;
                    if (p) p.textContent = initials;
                  }}
                />
              ) : (
                initials
              )}
            </div>
            <div className="vpick-row__info">
              <span className="vpick-row__name">{name}</span>
              <span className="vpick-row__sym">${sym}</span>
            </div>
            <div className="vpick-row__liq">{fmtCompact(row?.liquidity)}</div>
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

interface VariantPickerProps {
  currentMint?: string;
  variants: VariantRow[];
  assetId: string;
}

export function VariantPicker({
  currentMint,
  variants,
  assetId,
}: VariantPickerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const safeVariants = Array.isArray(variants) ? variants.filter(Boolean) : [];
  const tags = (row: VariantRow) => (Array.isArray(row?.tags) ? row.tags : []);

  const spotRows = safeVariants.filter(
    (v) =>
      v.kind !== "yield" &&
      !tags(v).includes("yield") &&
      !tags(v).includes("lst"),
  );
  const yieldRows = safeVariants.filter(
    (v) =>
      v.kind === "yield" ||
      tags(v).includes("yield") ||
      tags(v).includes("lst"),
  );

  const count = safeVariants.length;
  const label = count > 1 ? `${count}+ VARIANTS` : `${count} VARIANT`;

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    if (open) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  function handleSelect(row: VariantRow) {
    setOpen(false);
    const mint = safe(row?.mint);
    if (mint) router.push(`/token/${safe(assetId)}?mint=${mint}`);
  }

  if (count === 0) return null;

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
