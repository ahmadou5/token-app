"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface InfoTooltipProps {
  label: string;
}

type TooltipPos = {
  top: number;
  left: number;
};

export function InfoTooltip({ label }: InfoTooltipProps) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<TooltipPos>({ top: 0, left: 0 });

  const placeTooltip = useCallback(() => {
    const btn = btnRef.current;
    const tip = tipRef.current;
    if (!btn || !tip) return;

    const btnRect = btn.getBoundingClientRect();
    const tipRect = tip.getBoundingClientRect();
    const gap = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top = btnRect.top - tipRect.height - gap;
    const cannotFitTop = top < 8;
    if (cannotFitTop) {
      top = Math.min(vh - tipRect.height - 8, btnRect.bottom + gap);
    }

    let left = btnRect.left + btnRect.width / 2 - tipRect.width / 2;
    left = Math.max(8, Math.min(left, vw - tipRect.width - 8));

    setPos({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    placeTooltip();

    function onGlobalMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (!btnRef.current?.contains(target) && !tipRef.current?.contains(target)) {
        setOpen(false);
      }
    }

    function onRelayout() {
      placeTooltip();
    }

    document.addEventListener("mousedown", onGlobalMouseDown);
    window.addEventListener("resize", onRelayout);
    window.addEventListener("scroll", onRelayout, true);
    return () => {
      document.removeEventListener("mousedown", onGlobalMouseDown);
      window.removeEventListener("resize", onRelayout);
      window.removeEventListener("scroll", onRelayout, true);
    };
  }, [open, placeTooltip]);

  return (
    <span className="info-tip">
      <button
        ref={btnRef}
        type="button"
        className="info-tip__btn"
        aria-label="More info"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
      >
        i
      </button>
      {open && (
        <div
          ref={tipRef}
          className={`info-tip__tooltip ${open ? "info-tip__tooltip--visible" : ""}`}
          style={{ top: `${pos.top}px`, left: `${pos.left}px` }}
        >
          {label}
        </div>
      )}
    </span>
  );
}
