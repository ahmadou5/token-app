"use client";
import { TokenGrid } from "@/components/TokenGrid";
import { useRouter } from "next/navigation";

export default function MarketsPage() {
  const router = useRouter();
  const handleNavigate = (assetId: string) => {
    router.push(`/token/${assetId}`);
  };

  return (
    <div className="max-w-[1400px] w-full mx-auto px-6 py-12">
      <TokenGrid onTokenClick={(id) => handleNavigate(id.assetId)} />
    </div>
  );
}
