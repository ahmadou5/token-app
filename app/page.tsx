"use client";
import { TokenGrid } from "@/components/TokenGrid";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const handleNavigate = (assetId: string) => {
    router.push(`/tokens/${assetId}`);
  };
  return <TokenGrid onTokenClick={(id) => handleNavigate(id.assetId)} />;
}
