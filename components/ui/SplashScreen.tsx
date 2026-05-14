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
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2800); // Shorter, premium feel

    return () => clearTimeout(timer);
  }, []);

  if (!isMounted) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-all duration-700 ease-in-out",
        isVisible 
          ? "opacity-100 backdrop-blur-xl bg-background/80" 
          : "opacity-0 pointer-events-none backdrop-blur-0"
      )}
    >
      <div className="relative flex flex-col items-center gap-8 animate-premium-fade">
        <div className="relative group">
          {/* Subtle glow effect behind logo */}
          <div className="absolute -inset-4 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/30 transition-all duration-1000 animate-pulse" />
          
          <Image
            src={NavLogo}
            alt="Vela Logo"
            width={120}
            height={120}
            className="relative z-10 drop-shadow-2xl"
            priority
          />
        </div>

        <div className="flex flex-col items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight text-foreground/90">
            VELA
          </h1>
          
          <div className="h-[2px] w-32 overflow-hidden rounded-full bg-muted/30">
            <div className="h-full w-full bg-primary animate-progress origin-left" />
          </div>
          
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground/60">
            Initializing Ecosystem
          </p>
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/5 rounded-full blur-[120px]" />
      </div>
    </div>
  );
}
