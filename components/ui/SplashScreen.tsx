"use client";

import NavLogo from "@/assets/logo.svg";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    // Lock scroll while splash is visible
    document.body.classList.add("splash-active");
    
    const timer = setTimeout(() => {
      setIsVisible(false);
      document.body.classList.remove("splash-active");
    }, 3000); // 3 seconds for a solid branding moment

    return () => {
      clearTimeout(timer);
      document.body.classList.remove("splash-active");
    };
  }, []);

  // We render the structure even before mounting to help with "instant" feel
  // although it won't animate until hydration, it will be in the DOM.
  if (!isVisible && isMounted) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[10000] flex flex-col items-center justify-center transition-all duration-1000 ease-in-out bg-background",
        isVisible 
          ? "opacity-100 backdrop-blur-2xl" 
          : "opacity-0 pointer-events-none backdrop-blur-0"
      )}
    >
      <div className="relative flex flex-col items-center gap-12 animate-premium-fade">
        <div className="relative group">
          {/* Large glow effect behind logo */}
          <div className="absolute -inset-12 bg-primary/25 rounded-full blur-[80px] group-hover:bg-primary/40 transition-all duration-1000 animate-pulse" />
          
          <Image
            src={NavLogo}
            alt="Vela Logo"
            width={240} // Significantly bigger
            height={240}
            className="relative z-10 drop-shadow-[0_0_30px_rgba(153,69,255,0.3)] transition-transform duration-700 hover:scale-105"
            priority
          />
        </div>

        <div className="flex flex-col items-center gap-6">
          <h1 className="text-4xl font-black tracking-tighter text-foreground">
            VELA
          </h1>
          
          <div className="h-[3px] w-48 overflow-hidden rounded-full bg-muted/20">
            <div 
              className="h-full w-full animate-progress origin-left" 
              style={{ backgroundColor: '#9945FF' }} 
            />
          </div>
          
          <p className="text-[12px] font-bold uppercase tracking-[0.3em] text-muted-foreground/50">
            Capital Market Explorer
          </p>
        </div>
      </div>

      {/* Background decoration - more dramatic */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[160px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-accent/10 rounded-full blur-[160px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
    </div>
  );
}
