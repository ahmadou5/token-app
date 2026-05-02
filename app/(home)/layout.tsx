"use client";

import "../home.css";

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
