"use client";

import { AccountMeta, TransactionInstruction } from "@solana/web3.js";
/**
 * useStakePoolDeposit
 *
 * Deposits SOL into an SPL Stake Pool (used for both "Stake Pool" and
 * "Sanctum" sources) and receives LST in return.
 *
 * Uses @solana/spl-stake-pool for instruction building and
 * @pipeit/core TransactionBuilder for execution — same pattern as
 * useRaydiumCLMM.
 *
 * Deps:
 *   @solana/spl-stake-pool  (or sanctum-stake-pool-sdk for Sanctum)
 *   @pipeit/core
 *   @solana/kit
 */

import { useState, useCallback } from "react";

export type StakeDepositStatus =
  | "idle"
  | "building"
  | "signing"
  | "sending"
  | "confirmed"
  | "error";

export interface StakeDepositParams {
  /** SPL Stake Pool address (the market.address) */
  poolAddress: string;
  /** Amount of SOL to deposit in lamports */
  lamports: bigint;
  /** User wallet public key (base58) */
  userPublicKey: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signer: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpcSubscriptions: any;
}

export interface StakeDepositResult {
  signature: string;
  positionMint?: string;
  /** Estimated LST amount received (in LST lamports) */
  lstAmountEstimate: bigint;
}

export function useStakePoolDeposit() {
  const [status, setStatus] = useState<StakeDepositStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StakeDepositResult | null>(null);

  const deposit = useCallback(
    async (params: StakeDepositParams): Promise<StakeDepositResult> => {
      setStatus("building");
      setError(null);
      setResult(null);

      try {
        // ── 1. Lazy imports ────────────────────────────────────────────────
        const [
          { depositSol, getStakePoolAccount },
          { TransactionBuilder },
          { address },
          { Connection, PublicKey, LAMPORTS_PER_SOL },
        ] = await Promise.all([
          import("@solana/spl-stake-pool"),
          import("@pipeit/core"),
          import("@solana/kit"),
          import("@solana/web3.js"),
        ]);

        // ── 2. Create web3.js Connection from Kit rpc ──────────────────────
        const rpcEndpoint: string =
          (params.rpc as { __endpoint?: string }).__endpoint ??
          "https://api.mainnet-beta.solana.com";

        const connection = new Connection(rpcEndpoint, "confirmed");
        const poolPubkey = new PublicKey(params.poolAddress);
        const userPubkey = new PublicKey(params.userPublicKey);

        // ── 3. Fetch stake pool state to estimate output ───────────────────
        const stakePool = await getStakePoolAccount(connection, poolPubkey);
        const {
          account: { data: poolData },
        } = stakePool;

        // Estimate LST out: lamports * (poolTokenSupply / totalLamports)
        const totalLamports = BigInt(poolData.totalLamports.toString());
        const poolTokenSupply = BigInt(poolData.poolTokenSupply.toString());
        const lstAmountEstimate =
          totalLamports > BigInt(0)
            ? (params.lamports * poolTokenSupply) / totalLamports
            : params.lamports;

        // ── 4. Build depositSol instructions ──────────────────────────────
        //
        // depositSol returns a Transaction — we extract the instructions.
        const depositTx = await depositSol(
          connection,
          poolPubkey,
          userPubkey,
          Number(params.lamports),
          undefined, // referral optional
        );

        // ── 5. Convert web3.js instructions → Solana Kit IInstruction ─────
        function web3IxToKit(ix: TransactionInstruction) {
          return {
            programAddress: address(ix.programId.toBase58()),
            accounts: ix.keys.map((k: AccountMeta) => ({
              address: address(k.pubkey.toBase58()),
              role: (k.isSigner ? 2 : 0) | (k.isWritable ? 1 : 0),
            })),
            data:
              ix.data instanceof Uint8Array ? ix.data : new Uint8Array(ix.data),
          };
        }

        const kitInstructions = depositTx.instructions.map(web3IxToKit);

        setStatus("signing");

        // ── 6. Execute via TransactionBuilder ─────────────────────────────
        const signature: string = await new TransactionBuilder({
          rpc: params.rpc,
          computeUnits: { strategy: "fixed", units: 200_000n },
          priorityFee: { strategy: "fixed", microLamports: 100_000n },
          autoRetry: false,
        })
          .setFeePayerSigner(params.signer)
          .addInstructions(kitInstructions)
          .execute({
            rpcSubscriptions: params.rpcSubscriptions,
            commitment: "confirmed",
            skipPreflight: true,
          });

        setStatus("confirmed");
        const res: StakeDepositResult = { signature, lstAmountEstimate };
        setResult(res);
        return res;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setStatus("error");
        throw err;
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setResult(null);
  }, []);

  return { deposit, status, error, result, reset };
}
