"use client";

import { useCallback, useState } from "react";
import {
  useKitTransactionSigner,
  useSolanaClient,
  useWallet,
} from "@solana/connector";

import type { SwapQuote } from "./useSwapQuote";
import { useSwapSettings } from "@/context/SwapSettingsContext";
import { TransactionPlanResult } from "@solana/instruction-plans";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SwapExecuteStatus =
  | "idle"
  | "signing"
  | "sending"
  | "confirming"
  | "success"
  | "error";

export interface UseSwapExecuteReturn {
  swap: (quote: SwapQuote) => Promise<void>;
  status: SwapExecuteStatus;
  txSignature: string | null;
  error: string | null;
  reset: () => void;
}

// ─── Jupiter direct execute ───────────────────────────────────────────────────

async function executeJupiter(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawQuote: any,
  userPublicKey: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signTransaction: (tx: any) => Promise<any>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc: any,
  onStatus: (s: SwapExecuteStatus) => void,
): Promise<string> {
  // 1. Get swap transaction from Jupiter
  const swapRes = await fetch("https://quote-api.jup.ag/v6/swap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse: rawQuote,
      userPublicKey,
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: "auto",
    }),
  });
  const swapData = await swapRes.json();
  if (swapData.error) throw new Error(swapData.error);

  // 2. Deserialize
  const { VersionedTransaction } = await import("@solana/web3.js");
  const txBytes = Buffer.from(swapData.swapTransaction, "base64");
  const tx = VersionedTransaction.deserialize(txBytes);

  // 3. Sign
  onStatus("signing");
  const signedTx = await signTransaction(tx);

  // 4. Send
  onStatus("sending");
  const sig: string = await rpc
    .sendTransaction(signedTx.serialize(), {
      encoding: "base64",
      skipPreflight: false,
      maxRetries: 3,
    })
    .send();

  return sig;
}

// ─── Metis execute (Pipeit TransactionBuilder) ────────────────────────────────

async function executeMetis(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawQuote: any,
  userPublicKey: string,
  executionStrategy: "standard" | "economical" | "fast",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signer: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpcSubscriptions: any,
  onStatus: (s: SwapExecuteStatus) => void,
): Promise<string> {
  const apiKey =
    process.env.METIS_API_KEY ?? process.env.NEXT_PUBLIC_JUP_API_KEY ?? "";

  // Dynamically import Pipeit — keeps bundle smaller on pages that don't swap
  const [
    { createMetisClient, metisInstructionToKit },
    { TransactionBuilder },
    { address },
  ] = await Promise.all([
    import("@pipeit/actions/metis"),
    import("@pipeit/core"),
    import("@solana/kit"),
  ]);

  const client = createMetisClient({ apiKey });

  // Get swap instructions from Metis
  const swapIxs = await client.getSwapInstructions({
    quoteResponse: rawQuote,
    userPublicKey,
    wrapAndUnwrapSol: true,
    useSharedAccounts: true,
  });

  // Convert to Kit format (as per Pipeit docs)
  const instructions = [
    ...swapIxs.otherInstructions.map(metisInstructionToKit),
    ...swapIxs.setupInstructions.map(metisInstructionToKit),
    metisInstructionToKit(swapIxs.swapInstruction),
    ...(swapIxs.cleanupInstruction
      ? [metisInstructionToKit(swapIxs.cleanupInstruction)]
      : []),
  ];

  const lookupTableAddresses = swapIxs.addressLookupTableAddresses.map(address);

  onStatus("signing");

  // Build and execute with Pipeit TransactionBuilder
  const signature = await new TransactionBuilder({
    rpc,
    computeUnits: { strategy: "simulate", buffer: 1.1 },
    priorityFee: { strategy: "fixed", microLamports: 200_000 },
    lookupTableAddresses,
  })
    .setFeePayerSigner(signer)
    .addInstructions(instructions)
    .execute({
      rpcSubscriptions,
      commitment: "confirmed",
      skipPreflight: true,
      execution: executionStrategy, // 'standard' | 'economical' | 'fast'
    });

  onStatus("sending");
  return signature;
}

// ─── Titan execute (Pipeit getTitanSwapPlan + executePlan) ───────────────────

async function executeTitan(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawQuote: any,
  inputMint: string,
  outputMint: string,
  inputAmount: bigint,
  slippageBps: number,
  userPublicKey: string,
  executionStrategy: "standard" | "economical" | "fast",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signer: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpcSubscriptions: any,
  onStatus: (s: SwapExecuteStatus) => void,
): Promise<TransactionPlanResult> {
  const [{ getTitanSwapPlan }, { executePlan }] = await Promise.all([
    import("@pipeit/actions/titan"),
    import("@pipeit/core"),
  ]);

  // If quote was a Titan fallback (used Jupiter route data), we still use
  // getTitanSwapPlan to get the actual Titan execution path
  const { plan, lookupTableAddresses } = await getTitanSwapPlan({
    swap: {
      inputMint,
      outputMint,
      amount: inputAmount,
      slippageBps,
    },
    transaction: {
      userPublicKey,
    },
  });

  onStatus("signing");

  const signature = await executePlan(plan, {
    rpc,
    rpcSubscriptions,
    signer,
    lookupTableAddresses,
  });

  onStatus("sending");
  return signature;
}

// ─── Main hook ────────────────────────────────────────────────────────────────

export function useSwapExecute(): UseSwapExecuteReturn {
  const { settings } = useSwapSettings();
  const { account } = useWallet();
  const { signer, ready: signerReady } = useKitTransactionSigner();
  const { client } = useSolanaClient();

  const [status, setStatus] = useState<SwapExecuteStatus>("idle");
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStatus("idle");
    setTxSignature(null);
    setError(null);
  }, []);

  const swap = useCallback(
    async (quote: SwapQuote) => {
      if (!account || !signerReady || !signer || !client) {
        setError("Wallet not connected");
        return;
      }

      setStatus("signing");
      setError(null);
      setTxSignature(null);

      try {
        const { rpc, rpcSubscriptions } = client;
        const slippageBps = Math.round(settings.slippage * 100);

        // Build a signTransaction function for Jupiter direct (web3.js VersionedTransaction)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const signTransaction = async (tx: any) => {
          // @solana/connector's kit signer exposes modifyAndSignTransactions
          // For VersionedTransaction we need the raw wallet signing
          // We cast to access the underlying signTransaction if available
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rawSigner = signer as any;
          if (typeof rawSigner.signTransaction === "function") {
            return rawSigner.signTransaction(tx);
          }
          // Fallback: try wallet standard
          if (typeof rawSigner.wallet?.signTransaction === "function") {
            return rawSigner.wallet.signTransaction(tx);
          }
          throw new Error("Wallet does not support signTransaction");
        };

        let sig: string | TransactionPlanResult;

        switch (settings.provider) {
          case "metis":
            sig = await executeMetis(
              quote.rawQuote,
              account,
              settings.executionStrategy,
              signer,
              rpc,
              rpcSubscriptions,
              setStatus,
            );
            break;

          case "titan":
            sig = await executeTitan(
              quote.rawQuote,
              // We need the mints — they're in rawQuote for both Jupiter and Titan
              quote.rawQuote.inputMint ??
                quote.rawQuote.swapRequest?.inputMint ??
                "",
              quote.rawQuote.outputMint ??
                quote.rawQuote.swapRequest?.outputMint ??
                "",
              quote.inputAmount,
              slippageBps,
              account,
              settings.executionStrategy,
              signer,
              rpc,
              rpcSubscriptions,
              setStatus,
            );
            break;
        }

        setStatus("confirming");
        setTxSignature(sig as string);

        // Brief delay then mark success
        await new Promise((r) => setTimeout(r, 800));
        setStatus("success");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Swap failed";
        setError(msg);
        setStatus("error");
      }
    },
    [account, signerReady, signer, client, settings],
  );

  return { swap, status, txSignature, error, reset };
}
