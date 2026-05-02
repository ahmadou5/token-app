"use client";
import { TokenGrid } from "@/components/TokenGrid";
import { useRouter } from "next/navigation";

export default function MarketsPage() {
  const router = useRouter();
  const handleNavigate = (assetId: string) => {
    router.push(`/token/${assetId}`);
  };
  return (
    <div className="lg:max-w-7xl w-[98%] tg ml-auto mr-auto">
      <TokenGrid onTokenClick={(id) => handleNavigate(id.assetId)} />
    </div>
  );
}
