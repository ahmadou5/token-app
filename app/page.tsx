"use client";
import { TokenGrid } from "@/components/TokenGrid";

export default function Home() {
  return <TokenGrid onTokenClick={(t) => console.log(t)} />;
}
