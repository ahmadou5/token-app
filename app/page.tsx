"use client";
import { Navbar } from "@/components/Layout/Navbar";
import { SearchModal } from "@/components/SearcModal";
import { TokenGrid } from "@/components/TokenGrid";
import { useSearch } from "@/hooks/useSearch";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const { searchOpen, setSearchOpen } = useSearch();
  const handleNavigate = (assetId: string) => {
    router.push(`/token/${assetId}`);
  };
  return (
    <div className="w-auto">
      <Navbar />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <div className="max-w-7xl tg ml-auto mr-auto">
        <TokenGrid onTokenClick={(id) => handleNavigate(id.assetId)} />
      </div>
    </div>
  );
}
