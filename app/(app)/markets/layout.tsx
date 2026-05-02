"use client";

import { Navbar } from "@/components/Layout/Navbar";

export default function MarketsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-auto">
     
      {children}
    </div>
  );
}
