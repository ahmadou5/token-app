"use client";

import { SearchTrigger, SearchModal } from "@/components/SearcModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useSearchStore } from "@/store/useSearchStore";

export function Navbar() {
  const { searchOpen, setSearchOpen } = useSearchStore();

  return (
    <>
      <div className="tg-topbar">
        <div className="tg-topbar__left">
          <svg className="tg-topbar__logo" viewBox="0 0 20 20" fill="none">
            <circle
              cx="10"
              cy="10"
              r="8"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M6 10h8M10 6v8"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <span className="tg-topbar__brand">Tokens</span>
        </div>

        <div className="tg-topbar__center">
          <SearchTrigger
            onClick={() => setSearchOpen(true)}
            placeholder="Find tokens..."
          />
        </div>

        <div className="tg-topbar__right">
          <ThemeToggle />
        </div>
      </div>

      {/* Modal lives at Navbar level — portal-like, covers full viewport */}
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
