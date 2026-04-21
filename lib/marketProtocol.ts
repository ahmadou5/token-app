/**
 * marketProtocol.ts
 *
 * Single source of truth for every DEX / protocol that can appear
 * in a MarketEntry. Maps source strings → protocol descriptor so
 * the rest of the app knows:
 *   - which UI to render
 *   - which SDK to call
 *   - display name / colour / external link template
 */

export type ProtocolKind =
  | "raydium_clmm" // Concentrated liquidity, two-sided, tick-based range
  | "orca_whirlpool" // Concentrated liquidity, two-sided, tick-based range
  | "meteora_dlmm" // Discrete liquidity bins
  | "meteora_damm" // Dynamic AMM (xy=k style), two-sided
  | "pump_amm" // Pump.fun AMM, two-sided
  | "stake_pool" // SPL Stake Pool (single-sided SOL → LST)
  | "sanctum" // Sanctum router (single-sided SOL → LST)
  | "unsupported"; // Show nothing

export interface ProtocolDescriptor {
  kind: ProtocolKind;
  label: string; // Display name
  color: string; // Accent colour for the badge / button
  /** Is this a concentrated liquidity pool with a price range? */
  isCL: boolean;
  /** Is this a single-sided stake deposit? */
  isStake: boolean;
  /** Can we show an Add Liquidity UI at all? */
  canAddLiquidity: boolean;
  /** External pool explorer URL (use {address} placeholder) */
  explorerUrl: (address: string) => string;
}

const PROTOCOL_MAP: Record<string, ProtocolDescriptor> = {
  // ── Raydium CLMM ────────────────────────────────────────────────────────
  "raydium clamm": {
    kind: "raydium_clmm",
    label: "Raydium CLMM",
    color: "#c85cf3",
    isCL: true,
    isStake: false,
    canAddLiquidity: true,
    explorerUrl: (a) => `https://raydium.io/clmm/create-position/?pool_id=${a}`,
  },
  raydium_clamm: {
    kind: "raydium_clmm",
    label: "Raydium CLMM",
    color: "#c85cf3",
    isCL: true,
    isStake: false,
    canAddLiquidity: true,
    explorerUrl: (a) => `https://raydium.io/clmm/create-position/?pool_id=${a}`,
  },
  raydiumclmm: {
    kind: "raydium_clmm",
    label: "Raydium CLMM",
    color: "#c85cf3",
    isCL: true,
    isStake: false,
    canAddLiquidity: true,
    explorerUrl: (a) => `https://raydium.io/clmm/create-position/?pool_id=${a}`,
  },
  clmm: {
    kind: "raydium_clmm",
    label: "Raydium CLMM",
    color: "#c85cf3",
    isCL: true,
    isStake: false,
    canAddLiquidity: true,
    explorerUrl: (a) => `https://raydium.io/clmm/create-position/?pool_id=${a}`,
  },

  // ── Orca Whirlpool ───────────────────────────────────────────────────────
  orca: {
    kind: "orca_whirlpool",
    label: "Orca",
    color: "#00c2ff",
    isCL: true,
    isStake: false,
    canAddLiquidity: true,
    explorerUrl: (a) => `https://www.orca.so/liquidity/browse?address=${a}`,
  },
  "orca whirlpool": {
    kind: "orca_whirlpool",
    label: "Orca",
    color: "#00c2ff",
    isCL: true,
    isStake: false,
    canAddLiquidity: true,
    explorerUrl: (a) => `https://www.orca.so/liquidity/browse?address=${a}`,
  },

  // ── Meteora DLMM ────────────────────────────────────────────────────────
  "meteora dlmm": {
    kind: "meteora_dlmm",
    label: "Meteora DLMM",
    color: "#f5a623",
    isCL: true,
    isStake: false,
    canAddLiquidity: true,
    explorerUrl: (a) => `https://app.meteora.ag/dlmm/${a}`,
  },
  meteora_dlmm: {
    kind: "meteora_dlmm",
    label: "Meteora DLMM",
    color: "#f5a623",
    isCL: true,
    isStake: false,
    canAddLiquidity: true,
    explorerUrl: (a) => `https://app.meteora.ag/dlmm/${a}`,
  },

  // ── Meteora Dynamic AMM V2 ───────────────────────────────────────────────
  "meteora damm v2": {
    kind: "meteora_damm",
    label: "Meteora AMM",
    color: "#f5a623",
    isCL: false,
    isStake: false,
    canAddLiquidity: true,
    explorerUrl: (a) => `https://app.meteora.ag/pools/${a}`,
  },
  "meteora damm": {
    kind: "meteora_damm",
    label: "Meteora AMM",
    color: "#f5a623",
    isCL: false,
    isStake: false,
    canAddLiquidity: true,
    explorerUrl: (a) => `https://app.meteora.ag/pools/${a}`,
  },
  meteora: {
    kind: "meteora_damm",
    label: "Meteora AMM",
    color: "#f5a623",
    isCL: false,
    isStake: false,
    canAddLiquidity: true,
    explorerUrl: (a) => `https://app.meteora.ag/pools/${a}`,
  },

  // ── Pump AMM ─────────────────────────────────────────────────────────────
  "pump amm": {
    kind: "pump_amm",
    label: "Pump AMM",
    color: "#00c853",
    isCL: false,
    isStake: false,
    canAddLiquidity: true,
    explorerUrl: (a) => `https://pump.fun/advanced#pool=${a}`,
  },
  pump_amm: {
    kind: "pump_amm",
    label: "Pump AMM",
    color: "#00c853",
    isCL: false,
    isStake: false,
    canAddLiquidity: true,
    explorerUrl: (a) => `https://pump.fun/advanced#pool=${a}`,
  },

  // ── Stake Pool (generic SPL) ─────────────────────────────────────────────
  "stake pool": {
    kind: "stake_pool",
    label: "Stake Pool",
    color: "#9945FF",
    isCL: false,
    isStake: true,
    canAddLiquidity: true,
    explorerUrl: (a) => `https://solscan.io/account/${a}`,
  },
  stake_pool: {
    kind: "stake_pool",
    label: "Stake Pool",
    color: "#9945FF",
    isCL: false,
    isStake: true,
    canAddLiquidity: true,
    explorerUrl: (a) => `https://solscan.io/account/${a}`,
  },

  // ── Sanctum ──────────────────────────────────────────────────────────────
  sanctum: {
    kind: "sanctum",
    label: "Sanctum",
    color: "#7b61ff",
    isCL: false,
    isStake: true,
    canAddLiquidity: true,
    explorerUrl: (a) => `https://app.sanctum.so/pools/${a}`,
  },
};

const UNSUPPORTED: ProtocolDescriptor = {
  kind: "unsupported",
  label: "Unknown",
  color: "#666",
  isCL: false,
  isStake: false,
  canAddLiquidity: false,
  explorerUrl: (a) => `https://solscan.io/account/${a}`,
};

/**
 * Resolve a raw `market.source` string to a ProtocolDescriptor.
 * Case-insensitive, trims whitespace.
 */
export function resolveProtocol(
  source: string | undefined | null,
): ProtocolDescriptor {
  if (!source) return UNSUPPORTED;
  const key = source.trim().toLowerCase();
  return PROTOCOL_MAP[key] ?? UNSUPPORTED;
}
