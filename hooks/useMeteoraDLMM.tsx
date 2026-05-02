"use client";

import { useState, useCallback } from "react";
import { address } from "@solana/kit";
import { TransactionBuilder } from "@pipeit/core";

export type MeteoraStatus =
  | "idle"
  | "building"
  | "signing"
  | "sending"
  | "confirmed"
  | "error";

export interface MeteoraResult {
  signature: string;
  PositionMint?: string;
}

export interface DLMMDepositParams {
  poolAddress: string;
  binRange: number;
  amountX: bigint;
  amountY: bigint;
  strategy: "spot" | "curve" | "bid_ask";
  userPublicKey: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signer: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpcSubscriptions: any;
}

export interface DAMMDepositParams {
  poolAddress: string;
  amountA: bigint;
  amountB: bigint;
  slippagePct: number;
  userPublicKey: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signer: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpcSubscriptions: any;
}

// ─── API response types ───────────────────────────────────────────────────────
interface SerializedAccountMeta {
  pubkey: string;
  isSigner: boolean;
  isWritable: boolean;
}

interface SerializedInstruction {
  programId: string;
  keys: SerializedAccountMeta[];
  data: string; // base64
}

interface ApiSuccessResponse {
  instructions: SerializedInstruction[];
  error?: never;
}

interface ApiErrorResponse {
  error: string;
  instructions?: never;
}

type ApiResponse = ApiSuccessResponse | ApiErrorResponse;

// ─── shared deserializer ──────────────────────────────────────────────────────
function deserializeInstructions(raw: SerializedInstruction[]) {
  return raw.map((ix) => ({
    programAddress: address(ix.programId),
    accounts: ix.keys.map((k) => ({
      address: address(k.pubkey),
      role: (k.isSigner ? 2 : 0) | (k.isWritable ? 1 : 0),
    })),
    data: Uint8Array.from(Buffer.from(ix.data, "base64")),
  }));
}

// ─── DLMM ────────────────────────────────────────────────────────────────────
export function useMeteoraDLMM() {
  const [status, setStatus] = useState<MeteoraStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MeteoraResult | null>(null);

  const addLiquidity = useCallback(async (params: DLMMDepositParams) => {
    setStatus("building");
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/meteora/add-liquidity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "dlmm",
          rpcEndpoint:
            (params.rpc as { __endpoint?: string }).__endpoint ??
            "https://api.mainnet-beta.solana.com",
          poolAddress: params.poolAddress,
          binRange: params.binRange,
          amountX: params.amountX.toString(),
          amountY: params.amountY.toString(),
          strategy: params.strategy,
          userPublicKey: params.userPublicKey,
        }),
      });

      const json = (await res.json()) as ApiResponse;
      if (json.error) throw new Error(json.error);

      setStatus("signing");

      const signature: string = await new TransactionBuilder({
        rpc: params.rpc,
        computeUnits: { strategy: "fixed", units: 400_000n },
        priorityFee: { strategy: "fixed", microLamports: 150_000n },
        autoRetry: false,
      })
        .setFeePayerSigner(params.signer)
        .addInstructions(
          deserializeInstructions(
            json.instructions && json.instructions.length > 0
              ? json.instructions
              : [],
          ),
        )
        .execute({
          rpcSubscriptions: params.rpcSubscriptions,
          commitment: "confirmed",
          skipPreflight: true,
        });

      setStatus("confirmed");
      const result: MeteoraResult = { signature };
      setResult(result);
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStatus("error");
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setResult(null);
  }, []);

  return { addLiquidity, status, error, result, reset };
}

// ─── Dynamic AMM ─────────────────────────────────────────────────────────────
export function useMeteoraDynamicAMM() {
  const [status, setStatus] = useState<MeteoraStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MeteoraResult | null>(null);

  const addLiquidity = useCallback(async (params: DAMMDepositParams) => {
    setStatus("building");
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/meteora/add-liquidity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "damm",
          rpcEndpoint:
            (params.rpc as { __endpoint?: string }).__endpoint ??
            "https://api.mainnet-beta.solana.com",
          poolAddress: params.poolAddress,
          amountA: params.amountA.toString(),
          amountB: params.amountB.toString(),
          slippagePct: params.slippagePct,
          userPublicKey: params.userPublicKey,
        }),
      });

      const json = (await res.json()) as ApiResponse;
      if (json.error) throw new Error(json.error);

      setStatus("signing");

      const signature: string = await new TransactionBuilder({
        rpc: params.rpc,
        computeUnits: { strategy: "fixed", units: 300_000n },
        priorityFee: { strategy: "fixed", microLamports: 100_000n },
        autoRetry: false,
      })
        .setFeePayerSigner(params.signer)
        .addInstructions(
          deserializeInstructions(
            json.instructions && json.instructions.length > 0
              ? json.instructions
              : [],
          ),
        )
        .execute({
          rpcSubscriptions: params.rpcSubscriptions,
          commitment: "confirmed",
          skipPreflight: true,
        });

      setStatus("confirmed");
      const result: MeteoraResult = { signature };
      setResult(result);
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStatus("error");
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setResult(null);
  }, []);

  return { addLiquidity, status, error, result, reset };
}
