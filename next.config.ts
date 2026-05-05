import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: [
    "@coral-xyz/anchor",
    "@solana-developers/helpers",
    "@meteora-ag/m3m3",
    "@mercurial-finance/dynamic-amm-sdk",
    "@kamino-finance/klend-sdk",
    "@mrgnlabs/marginfi-client-v2",
    "@mrgnlabs/mrgn-common",
    "decimal.js",
  ],
};

export default nextConfig;
