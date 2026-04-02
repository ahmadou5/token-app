"use client";
import { TokenGrid } from "@/components/TokenGrid";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const handleNavigate = (assetId: string) => {
    router.push(`/token/${assetId}`);
  };
  return <TokenGrid onTokenClick={(id) => handleNavigate(id.assetId)} />;
}
