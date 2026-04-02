"use client";

import { useTheme } from "next-themes";
import { useTransition } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [isPending, startTransition] = useTransition();

  // Avoid hydration mismatch by deferring theme operations
  if (isPending || !resolvedTheme) {
    return (
      <div className="theme-toggle theme-toggle--placeholder" aria-hidden />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      className="theme-toggle"
      onClick={() => startTransition(() => setTheme(isDark ? "light" : "dark"))}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <span className="theme-toggle__track">
        <span className="theme-toggle__thumb">
          {isDark ? (
            // Moon icon
            <svg viewBox="0 0 16 16" fill="none" width="10" height="10">
              <path
                d="M13.5 10A6 6 0 0 1 6 2.5a6 6 0 1 0 7.5 7.5Z"
                fill="currentColor"
              />
            </svg>
          ) : (
            // Sun icon
            <svg viewBox="0 0 16 16" fill="none" width="10" height="10">
              <circle cx="8" cy="8" r="3" fill="currentColor" />
              <path
                d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          )}
        </span>
      </span>
    </button>
  );
}
