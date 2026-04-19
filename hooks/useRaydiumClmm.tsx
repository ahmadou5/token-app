"use client";

/**
 * useRaydiumCLMM
 *
 * Builds and executes a Raydium CLMM openPosition transaction
 * using @solana/kit + @pipeit/core TransactionBuilder — same
 * execution pattern as your executeMetis helper.
 *
 * Dependencies (already in your project or add them):
 *   @raydium-io/raydium-sdk-v2
 *   @pipeit/core
 *   @solana/kit
 *   @solana/web3.js  (peer of raydium sdk)
 */

import { useState, useCallback } from "react";
import type {
  AccountMeta,
  Keypair,
  TransactionInstruction,
} from "@solana/web3.js";

export type CLMMStatus =
  | "idle"
  | "building"
  | "signing"
  | "sending"
  | "confirmed"
  | "error";

export interface OpenPositionParams {
  /** Pool / market address (Raydium CLMM pool id) */
  poolId: string;
  /** Lower tick index for the position */
  tickLower: number;
  /** Upper tick index for the position */
  tickUpper: number;
  /** Amount of token A to deposit (in lamports / raw units) */
  amountA: bigint;
  /** Amount of token B to deposit (in lamports / raw units) */
  amountB: bigint;
  /** Slippage tolerance 0–100 (percent, e.g. 1 = 1%) */
  slippagePct: number;
  /** User wallet public key (base58) */
  userPublicKey: string;
  /** Solana Kit signer (from useWallet / wallet adapter) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signer: any;
  /** Solana Kit RPC instance */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc: any;
  /** Solana Kit RPC subscriptions instance */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpcSubscriptions: any;
}

export interface CLMMResult {
  signature: string;
  positionMint: string;
}

export function useRaydiumCLMM() {
  const [status, setStatus] = useState<CLMMStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CLMMResult | null>(null);

  const openPosition = useCallback(
    async (params: OpenPositionParams): Promise<CLMMResult> => {
      setStatus("building");
      setError(null);
      setResult(null);

      try {
        // ── 1. Lazy-import heavy deps ──────────────────────────────────────
        const [
          { Raydium, TxVersion },
          { TransactionBuilder },
          { address, lamports },
        ] = await Promise.all([
          import("@raydium-io/raydium-sdk-v2"),
          import("@pipeit/core"),
          import("@solana/kit"),
        ]);

        // ── 2. Boot Raydium SDK (cluster inferred from rpc endpoint) ────────
        //
        // Raydium SDK still relies on @solana/web3.js Connection under the hood.
        // We create a thin Connection from the rpc url so the SDK can fetch
        // on-chain pool state while our TX is sent via Solana Kit.
        const { Connection, PublicKey } = await import("@solana/web3.js");

        // Extract the http endpoint from the Solana Kit rpc object.
        // Kit rpc objects expose `__endpoint` or similar — adjust if your
        // factory differs.
        const rpcEndpoint: string =
          (params.rpc as { __endpoint?: string }).__endpoint ??
          "https://api.mainnet-beta.solana.com";

        const connection = new Connection(rpcEndpoint, "confirmed");

        const raydium = await Raydium.load({
          connection,
          owner: new PublicKey(params.userPublicKey),
          disableFeatureCheck: true,
          blockhashCommitment: "confirmed",
        });

        // ── 3. Fetch pool info ───────────────────────────────────────────────
        const { clmm } = raydium;
        const poolInfo = await clmm.getRpcClmmPoolInfo({
          poolId: params.poolId,
        });

        if (!poolInfo) {
          throw new Error(`CLMM pool not found: ${params.poolId}`);
        }

        // ── 4. Build open-position instructions ─────────────────────────────
        const slippage = params.slippagePct / 100;

        const openPositionPayload = {
          poolInfo,
          ownerInfo: {
            feePayer: new PublicKey(params.userPublicKey),
            wallet: new PublicKey(params.userPublicKey),
            tokenAccounts: [],
            associatedOnly: true,
            checkCreateATAOwner: true,
          },
          tickLower: params.tickLower,
          tickUpper: params.tickUpper,
          base: "MintA",
          baseAmount: params.amountA,
          otherAmountMax:
            (params.amountB * BigInt(Math.round((1 + slippage) * 10000))) /
            BigInt(10000),
          withMetadata: "create",
          getEphemeralSigners: async (n: number) => {
            // Return n ephemeral keypairs from Solana Kit
            const { generateKeyPairSigner } = await import("@solana/kit");
            return Promise.all(
              Array.from({ length: n }, () => generateKeyPairSigner()),
            );
          },
        } as unknown as Parameters<typeof clmm.openPositionFromLiquidity>[0];

        const openPositionResult = (await clmm.openPositionFromLiquidity(
          openPositionPayload,
        )) as unknown as {
          instructions: TransactionInstruction[];
          signers: Keypair[];
          extInfo?: { nftMint?: { toBase58: () => string } };
        };

        const rawIxs = openPositionResult.instructions;
        const { signers, extInfo } = openPositionResult;

        // ── 5. Convert web3.js TransactionInstruction → Solana Kit format ───
        //
        // @pipeit/core's TransactionBuilder accepts Solana Kit IInstruction.
        // We convert the old-style instructions manually.
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

        const kitInstructions = rawIxs.map(web3IxToKit);

        // ── 6. Collect extra signers (position NFT mint, etc.) ───────────────
        // These are web3.js Keypairs; wrap them as Solana Kit signers.
        const extraKitSigners = await Promise.all(
          signers.map(async (kp: Keypair) => {
            const { createSignerFromKeyPair } = await import("@solana/kit");
            // kp.secretKey is a Uint8Array(64) — convert to CryptoKey
            const cryptoKey = await crypto.subtle.importKey(
              "raw",
              kp.secretKey.slice(0, 32), // seed
              "Ed25519",
              false,
              ["sign"],
            );
            const signerInput: Parameters<typeof createSignerFromKeyPair>[0] = {
              privateKey: cryptoKey,
              publicKey: cryptoKey,
            };
            return createSignerFromKeyPair(signerInput);
          }),
        );

        const positionMint: string =
          extInfo?.nftMint?.toBase58?.() ?? "unknown";

        setStatus("signing");

        // ── 7. Build & execute via TransactionBuilder (Solana Kit) ──────────
        const signature: string = await new TransactionBuilder({
          rpc: params.rpc,
          computeUnits: { strategy: "fixed", units: 400_000 },
          priorityFee: { strategy: "fixed", microLamports: 200_000 },
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
        const res: CLMMResult = { signature, positionMint };
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

  return { openPosition, status, error, result, reset };
}
