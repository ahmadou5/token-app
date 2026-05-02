"use client";

import "../home.css";
import { HomeNav } from "./HomeNav";

export default function HomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="hp-root">
      {children}
    </div>
  );
}
