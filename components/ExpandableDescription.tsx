"use client";

import { useState } from "react";

interface ExpandableDescriptionProps {
  text: string;
  tokenName?: string | null;
  maxChars?: number;
}

export function ExpandableDescription({
  text,
  tokenName,
  maxChars = 200,
}: ExpandableDescriptionProps) {
  const [expanded, setExpanded] = useState(false);

  const shouldTruncate = text.length > maxChars;
  const display =
    shouldTruncate && !expanded
      ? text.slice(0, maxChars).trimEnd() + "…"
      : text;

  return (
    <div className="td-card">
      <h3 className="td-card__title">About {tokenName}</h3>
      <p className="td-about__text">{display}</p>
      {shouldTruncate && (
        <button
          className="td-about__toggle"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? "Show less" : "Read more"}
          <svg
            viewBox="0 0 12 12"
            fill="none"
            width="11"
            height="11"
            style={{
              transform: expanded ? "rotate(180deg)" : "none",
              transition: "transform 160ms",
            }}
          >
            <path
              d="M2 4l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
