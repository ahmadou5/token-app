import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: [
    "@coral-xyz/anchor",
    "@solana-developers/helpers",
    "@meteora-ag/m3m3",
    "@mercurial-finance/dynamic-amm-sdk",
  ],
};

export default nextConfig;
