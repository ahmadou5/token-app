import { useSearch } from "@/hooks/useSearch";
import { SearchTrigger } from "../SearcModal";
import { ThemeToggle } from "../theme/ThemeToggle";

export const Navbar = () => {
  const { setSearchOpen } = useSearch();
  return (
    <div className="tg-topbar px-80">
      <div className="tg-topbar__left">
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
  );
};
