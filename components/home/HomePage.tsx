"use client";

import { HomeNav } from "@/app/(home)/HomeNav";
import { HeroSection } from "@/components/home/HeroSection";
import TradingSection from "@/components/home/TradingSection";
import { EarnSection } from "@/components/home/EarnSection";
import MarketsSection from "@/components/home/MarketsSection";
import StakingSection from "@/components/home/StakingSection";
import { HomeFooter } from "@/components/home/HomeFooter";
import { TokenAsset } from "@/hooks/useToken";
import { ValidatorInfo } from "@/types/validator";

export function HomePage({ 
  initialMarkets = [], 
  initialValidators = [] 
}: { 
  initialMarkets?: TokenAsset[], 
  initialValidators?: ValidatorInfo[] 
}) {
  return (
    <>
    
      <HeroSection />
      <TradingSection />
      <EarnSection />
      <MarketsSection initialTokens={initialMarkets} />
      <StakingSection initialValidators={initialValidators} />
      <HomeFooter />
    </>
  );
}
