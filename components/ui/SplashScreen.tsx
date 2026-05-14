"use client";

import NavLogo from "@/assets/logo.svg";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2000); // Adjust timing as needed

    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[999] flex items-center justify-center bg-background transition-opacity duration-500",
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none",
      )}
    >
      <div className="relative">
        <Image
          src={NavLogo}
          alt="Logo"
          width={180}
          height={180}
          className="animate-pulse"
          priority
        />
        <div className="absolute bottom-[-40px] left-1/2 transform -translate-x-1/2">
          <div className="h-1 w-24 overflow-hidden rounded-full bg-gray-800">
            <div className="h-full w-full bg-primary animate-progress origin-left" />
          </div>
        </div>
      </div>
    </div>
  );
}
