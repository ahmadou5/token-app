"use client";

import { useTheme } from "next-themes";
import { startTransition, useSyncExternalStore } from "react";

function useIsMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" width="11" height="11">
      <circle cx="8" cy="8" r="3" fill="currentColor" />
      <path
        d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" width="11" height="11">
      <path
        d="M13.5 10A6 6 0 0 1 6 2.5a6 6 0 1 0 7.5 7.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isMounted = useIsMounted();

  const isDark = resolvedTheme === "dark";

  // Must render same element type (button) on both server and client
  // Use aria-hidden + disabled to neutralize it server-side
  return (
    <button
      className="theme-toggle"
      onClick={() => startTransition(() => setTheme(isDark ? "light" : "dark"))}
      aria-label={
        isMounted
          ? `Switch to ${isDark ? "light" : "dark"} mode`
          : "Theme toggle"
      }
      title={
        isMounted ? `Switch to ${isDark ? "light" : "dark"} mode` : undefined
      }
      disabled={!isMounted}
      aria-hidden={!isMounted}
    >
      <div className="theme-toggle__track">
        <span className="theme-toggle__thumb">
          {isMounted ? isDark ? <MoonIcon /> : <SunIcon /> : null}
        </span>
      </div>
    </button>
  );
}
