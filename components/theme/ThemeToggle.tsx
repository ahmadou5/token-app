// components/theme/ThemeToggle.tsx
"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
//import { Sun, Moon, Monitor } from "lucide-react";
const sun = () => {
  return (
    <svg viewBox="0 0 16 16" fill="none" width="10" height="10">
      <circle cx="8" cy="8" r="3" fill="currentColor" />
      <path
        d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
};
const moon = () => {
  return (
    <svg viewBox="0 0 16 16" fill="none" width="10" height="10">
      <path
        d="M13.5 10A6 6 0 0 1 6 2.5a6 6 0 1 0 7.5 7.5Z"
        fill="currentColor"
      />
    </svg>
  );
};
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  // Prevent hydration mismatch
  if (typeof window === "undefined") return <ThemeToggleSkeleton />;

  const options = [
    { value: "light", Icon: sun, label: "Light" },
    { value: "dark", Icon: moon, label: "Dark" },
  ] as const;

  return (
    <div className="space-y-2">
      <div
        className="inline-flex rounded-xl p-1 gap-1"
        style={{
          background: "var(--bg-subtle)",
          border: "1px solid var(--border)",
        }}
      >
        {options.map(({ value, Icon, label }) => {
          const active = theme === value;
          return (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                transition-[background,color,box-shadow] duration-200
                focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                fontFamily: "var(--font-dm-sans, sans-serif)",
                background: active ? "var(--brand-hex)" : "transparent",
                color: active ? "var(--text-inverse)" : "var(--text-muted)",
                boxShadow: active ? "var(--shadow-brand)" : "none",
                outlineColor: "var(--brand-hex)",
              }}
              aria-pressed={active}
            >
              <Icon />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ThemeToggleSkeleton() {
  return (
    <div className="space-y-2">
      <div
        className="h-4 w-20 rounded animate-pulse"
        style={{ background: "var(--border)" }}
      />
      <div
        className="h-10 w-40 rounded-xl animate-pulse"
        style={{ background: "var(--border)" }}
      />
    </div>
  );
}
