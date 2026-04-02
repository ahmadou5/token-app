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
  return <TokenGrid onTokenClick={(t) => console.log(t)} />;
}
