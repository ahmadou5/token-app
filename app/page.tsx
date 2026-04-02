"use client";
import { TokenGrid } from "@/component/TokenGrid";
import { tokenRequest } from "@/lib/token";
import Image from "next/image";
import { useEffect } from "react";

export default function Home() {
  const fetchTokens = async () => {
    const token = await tokenRequest.curatedAssetsList();
    console.log("token", token);
  };
  useEffect(() => {
    fetchTokens();
  }, []);
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <TokenGrid />
      </main>
    </div>
  );
}
