"use client";

import { useState, useCallback } from "react";
import type {
  Rpc,
  RpcSendOptions,
  RpcSubscriptions,
  SignatureNotificationsApi,
  SlotNotificationsApi,
  SolanaRpcApi,
  SolanaRpcSubscriptionsApi,
  TransactionSigner,
} from "@solana/kit";
import { useSolanaClient } from "@solana/connector";
import type {
  TransactionInstruction,
  Keypair,
  AccountMeta,
} from "@solana/web3.js";

// This matches the TransactionPayload structure from @orca-so/common-sdk
interface OrcaTransactionPayload {
  instructions: {
    instruction: TransactionInstruction;
    signers: Keypair[];
  }[];
}
// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

export type CLMMStatus =
  | "idle"
  | "building"
  | "signing"
  | "sending"
  | "confirmed"
  | "error";

export interface OpenPositionParams {
  poolId: string;
  tickLower: number;
  tickUpper: number;
  amountA: bigint;
  amountBMax: bigint;
  slippagePct: number;
  userPublicKey: string;
  signer: TransactionSigner;
  rpc: unknown;
  rpcSubscriptions: unknown;
}

export interface CLMMResult {
  signature: string;
  positionMint?: string;
}

// ---------------------------------------------------------------------------
// Helper: The "Fix" for your Instruction Error
// ---------------------------------------------------------------------------

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
  // 1. Normalize Program Address
  const programAddress =
    typeof ix.programId === "string"
      ? addressFn(ix.programId)
      : addressFn(ix.programId.toBase58());

  return {
    programAddress,
    // 2. Normalize Account Metas
    accounts: ix.keys.map((k) => ({
      address:
        typeof k.pubkey === "string"
          ? addressFn(k.pubkey)
          : addressFn(k.pubkey.toBase58()),
      // Role: bitwise OR (writable = 1, signer = 2)
      role: (k.isWritable ? 1 : 0) | (k.isSigner ? 2 : 0),
    })),
    // 3. Normalize Data (Ensures it's a Uint8Array for @solana/kit)
    data: ix.data instanceof Uint8Array ? ix.data : new Uint8Array(ix.data),
  };
}

/** Converts web3.js Keypair to @solana/kit TransactionSigner */
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
// Main Hook
// ---------------------------------------------------------------------------

export function useRaydiumCLMM() {
  const [status, setStatus] = useState<CLMMStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CLMMResult | null>(null);
  const { client } = useSolanaClient();

  const openPosition = useCallback(
    async (params: OpenPositionParams): Promise<CLMMResult> => {
      setStatus("building");
      setError(null);
      try {
        // 1. Lazy load dependencies
        const [
          { Raydium, TxVersion },
          { TransactionBuilder },
          { address },
          { Connection, PublicKey, Keypair },
          { BN },
        ] = await Promise.all([
          import("@raydium-io/raydium-sdk-v2"),
          import("@pipeit/core"),
          import("@solana/kit"),
          import("@solana/web3.js"),
          import("bn.js"),
        ]);

        // 2. Setup Connection
        const rpcEndpoint =
          process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
          "https://api.mainnet-beta.solana.com";
        const connection = new Connection(rpcEndpoint, "confirmed");
        const ownerPubkey = new PublicKey(params.userPublicKey);

        // 3. Initialize Raydium SDK
        const raydium = await Raydium.load({
          connection,
          owner: ownerPubkey,
          disableFeatureCheck: true,
          blockhashCommitment: "confirmed",
        });

        const { poolInfo, poolKeys } = await raydium.clmm.getPoolInfoFromRpc(
          params.poolId,
        );

        // 4. Handle ephemeral keypairs for the NFT position
        const ephemeralKps: InstanceType<typeof Keypair>[] = [];

        // 5. Build Raydium Instructions (Legacy mode for instruction extraction)
        const buildData = await raydium.clmm.openPositionFromBase({
          poolInfo,
          poolKeys,
          ownerInfo: { useSOLBalance: true },
          tickLower: params.tickLower,
          tickUpper: params.tickUpper,
          base: "MintA",
          baseAmount: new BN(params.amountA.toString()),
          otherAmountMax: new BN(params.amountBMax.toString()),
          withMetadata: "create",
          txVersion: TxVersion.LEGACY,
          getEphemeralSigners: async (n: number) => {
            const kps = Array.from({ length: n }, () => Keypair.generate());
            ephemeralKps.push(...kps);
            return kps;
          },
        });

        // ── 6. Extraction logic (Typed) ──────────────────────────────────────
        const builtTx = await buildData.transaction;

        // Extract the actual web3.js instructions
        const rawIxs = builtTx.instructions;

        // Extract and flatten all required signers (like positionMintKp)
        const sdkSigners = buildData.signers ?? ephemeralKps; // Fallback to ephemeral if SDK doesn't return signers explicitly

        const positionMint =
          buildData.extInfo?.nftMint?.toBase58?.() ?? "unknown";
        if (rawIxs.length === 0) {
          throw new Error("No instructions returned from SDK");
        }

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

        const kitInstructions = rawIxs.map(web3IxToKit);

        // 8. Convert Keypairs to Kit Signers
        const extraKitSigners = await Promise.all(
          sdkSigners.map(keypairToKitSigner),
        );

        setStatus("signing");
        const { rpc, rpcSubscriptions } = client ?? params;
        // 9. Execute via Pipeit Builder
        const txBuilder = new TransactionBuilder({
          rpc: rpc as Rpc<SolanaRpcApi>,
          computeUnits: { strategy: "fixed", units: 600_000 }, // CLMM is heavy, 600k is safer
          priorityFee: { strategy: "fixed", microLamports: 100_000 },
          autoRetry: false,
        })
          .setFeePayerSigner(params.signer)
          .addInstructions(kitInstructions);

        // Add the NFT position mint signers

        const signature = await txBuilder.execute({
          rpcSubscriptions: rpcSubscriptions as RpcSubscriptions<
            SignatureNotificationsApi &
              SlotNotificationsApi &
              SolanaRpcSubscriptionsApi
          >,
          commitment: "confirmed",
          skipPreflight: true,
        });

        setStatus("confirmed");
        const res = { signature, positionMint };
        setResult(res);
        return res;
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
