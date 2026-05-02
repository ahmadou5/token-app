"use client";

import { HomeNav } from "@/app/(home)/HomeNav";
import { HeroSection } from "@/components/home/HeroSection";
import TradingSection from "@/components/home/TradingSection";
import { EarnSection } from "@/components/home/EarnSection";
import MarketsSection from "@/components/home/MarketsSection";
import StakingSection from "@/components/home/StakingSection";
import { HomeFooter } from "@/components/home/HomeFooter";

export function HomePage() {
  return (
    <>
      <HomeNav />
      <HeroSection />
      <TradingSection />
      <EarnSection />
      <MarketsSection />
      <StakingSection />
      <HomeFooter />
    </>
  );
}
