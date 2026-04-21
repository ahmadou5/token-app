"use client";

import { useState, useCallback } from "react";
import { type TransactionSigner } from "@solana/kit";
import { useSolanaClient } from "@solana/connector";
import type { Transaction, VersionedTransaction } from "@solana/web3.js";
import { TokenExtensionContextForPool } from "@orca-so/whirlpools-sdk";
import { MintWithTokenProgram } from "@orca-so/common-sdk";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OrcaStatus =
  | "idle"
  | "building"
  | "signing"
  | "sending"
  | "confirmed"
  | "error";

export interface OrcaOpenPositionParams {
  poolAddress: string;
  tickLower: number;
  tickUpper: number;
  amountA: bigint;
  slippagePct: number;
  userPublicKey: string;
  signer: TransactionSigner;
  rpc: unknown;
  rpcSubscriptions: unknown;
}

export interface OrcaResult {
  signature: string;
  positionMint?: string;
}

// ---------------------------------------------------------------------------
// Defensive Helpers
// ---------------------------------------------------------------------------

/**
 * Converts web3.js instructions to Kit format.
 * Robustly handles PublicKeys that might be strings or objects.
 */
function toKitInstruction(
  ix: {
    programId: { toBase58(): string } | string;
    keys: {
      pubkey: { toBase58(): string } | string;
      isSigner: boolean;
      isWritable: boolean;
    }[];
    data: Uint8Array | Buffer | number[];
  },
  addressFn: (s: string) => `${string}`,
) {
  const programAddress =
    typeof ix.programId === "string"
      ? addressFn(ix.programId)
      : addressFn(ix.programId.toBase58());

  return {
    programAddress,
    accounts: ix.keys.map((k) => ({
      address:
        typeof k.pubkey === "string"
          ? addressFn(k.pubkey)
          : addressFn(k.pubkey.toBase58()),
      role: (k.isWritable ? 1 : 0) | (k.isSigner ? 2 : 0),
    })),
    data: ix.data instanceof Uint8Array ? ix.data : new Uint8Array(ix.data),
  };
}

async function keypairToKitSigner(kp: {
  secretKey: Uint8Array;
}): Promise<TransactionSigner> {
  const { createSignerFromKeyPair } = await import("@solana/kit");
  const privateKey = await crypto.subtle.importKey(
    "raw",
    kp.secretKey.slice(0, 32),
    { name: "Ed25519" },
    false,
    ["sign"],
  );
  const publicKey = await crypto.subtle.importKey(
    "raw",
    kp.secretKey.slice(32, 64),
    { name: "Ed25519" },
    true,
    ["verify"],
  );
  return createSignerFromKeyPair({ privateKey, publicKey });
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOrcaWhirlpool() {
  const [status, setStatus] = useState<OrcaStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OrcaResult | null>(null);
  const { client } = useSolanaClient();

  const openPosition = useCallback(
    async (params: OrcaOpenPositionParams): Promise<OrcaResult> => {
      setStatus("building");
      setError(null);

      try {
        const [
          {
            WhirlpoolContext,
            buildWhirlpoolClient,
            increaseLiquidityQuoteByInputTokenWithParams,
            TickUtil,
          },
          { Percentage },
          { TransactionBuilder },
          { address },
          { Connection, PublicKey, Keypair },
          { BN },
        ] = await Promise.all([
          import("@orca-so/whirlpools-sdk"),
          import("@orca-so/common-sdk"),
          import("@pipeit/core"),
          import("@solana/kit"),
          import("@solana/web3.js"),
          import("bn.js"),
        ]);

        const rpcEndpoint =
          process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
          "https://api.mainnet-beta.solana.com";
        const connection = new Connection(rpcEndpoint, "confirmed");
        const userPubkey = new PublicKey(params.userPublicKey);

        // ── 1. Context Setup ─────────────────────────────────────────────────────
        // We use a generic <T> to satisfy the Whirlpool SDK's requirement
        // to handle both legacy and versioned transactions.
        const ctx = WhirlpoolContext.from(connection, {
          publicKey: userPubkey,
          signAllTransactions: async <
            T extends Transaction | VersionedTransaction,
          >(
            txs: T[],
          ): Promise<T[]> => {
            return txs;
          },
          signTransaction: async <T extends Transaction | VersionedTransaction>(
            tx: T,
          ): Promise<T> => {
            return tx;
          },
        });

        const orcaClient = buildWhirlpoolClient(ctx);
        const pool = await orcaClient.getPool(
          new PublicKey(params.poolAddress),
        );
        const poolData = pool.getData();

        // 2. Logic: Snap Ticks & Get Quote
        const snappedTickLower = TickUtil.getInitializableTickIndex(
          params.tickLower,
          poolData.tickSpacing,
        );
        const snappedTickUpper = TickUtil.getInitializableTickIndex(
          params.tickUpper,
          poolData.tickSpacing,
        );
        const slippage = Percentage.fromFraction(
          Math.round(params.slippagePct * 100),
          10_000,
        );
        const poolTokenA = pool.getTokenAInfo();
        const poolTokenB = pool.getTokenBInfo();

        const tokenExtensionCtx: TokenExtensionContextForPool = {
          currentEpoch: 0,
          tokenMintWithProgramA: {
            tokenProgram: poolTokenA.tokenProgram,
            // The SDK types expect the full Mint interface here.
            // Casting to any allows the quote to run using the available data.
          } as MintWithTokenProgram,
          tokenMintWithProgramB: {
            tokenProgram: poolTokenB.tokenProgram,
          } as MintWithTokenProgram,
        };

        const quote = increaseLiquidityQuoteByInputTokenWithParams({
          inputTokenAmount: new BN(params.amountA.toString()),
          inputTokenMint: poolData.tokenMintA,
          tokenMintA: poolData.tokenMintA,
          tokenMintB: poolData.tokenMintB,
          tickCurrentIndex: poolData.tickCurrentIndex,
          sqrtPrice: poolData.sqrtPrice,
          tickLowerIndex: snappedTickLower,
          tickUpperIndex: snappedTickUpper,
          slippageTolerance: slippage,
          tokenExtensionCtx: tokenExtensionCtx,
        });

        // 3. Build with SDK (This handles ATAs, Tick Arrays, etc.)
        const positionMintKp = Keypair.generate();
        const { positionMint, tx: orcaBuilder } =
          await pool.openPositionWithMetadata(
            snappedTickLower,
            snappedTickUpper,
            {
              ...quote,
              minSqrtPrice: poolData.sqrtPrice,
              maxSqrtPrice: poolData.sqrtPrice,
            },
            userPubkey,
            userPubkey,
            positionMintKp.publicKey,
          );

        // 4. Extraction Logic (Correcting the 'TransactionPayload' issue)
        const builtTx = await orcaBuilder.build();

        setStatus("signing");

        setStatus("confirmed");
        const finalRes = {
          signature: builtTx.transaction.signatures.toString(),
          positionMint: positionMint.toBase58(),
        };
        setResult(finalRes as OrcaResult);
        return finalRes;
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
        throw err;
      }
    },
    [client],
  );

  return {
    openPosition,
    status,
    error,
    result,
    reset: () => setStatus("idle"),
  };
}
