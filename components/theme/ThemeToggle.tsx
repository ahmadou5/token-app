"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

// Hydration guard — returns false on server, true on client
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
  // resolvedTheme is always "light" or "dark" — never undefined after mount
  const { resolvedTheme, setTheme } = useTheme();
  const isMounted = useIsMounted();

  // Render a same-size placeholder on server to avoid layout shift
  if (!isMounted) {
    return <div className="theme-toggle--placeholder" aria-hidden="true" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      className="theme-toggle"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <div className="theme-toggle__track">
        <span className="theme-toggle__thumb">
          {isDark ? <MoonIcon /> : <SunIcon />}
        </span>
      </div>
    </button>
  );
}
