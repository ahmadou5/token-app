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
import { useTxModal } from "@/context/TxModalContext";

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSignaturesFromTransactionPlanResult(
  result: TransactionPlanResult,
): string[] {
  if (result.kind === "single") {
    if (result.status !== "successful") return [];
    return [result.context.signature];
  }

  return result.plans.flatMap(getSignaturesFromTransactionPlanResult);
}
function isTemporarilyRestricted(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("5663019") ||
    msg.includes("ProgramExecutionTemporarilyRestricted")
  );
}

async function waitOneSlot(): Promise<void> {
  await new Promise((r) => setTimeout(r, 500));
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
    process.env.NEXT_PUBLIC_METIS_API_KEY ??
    process.env.NEXT_PUBLIC_JUP_API_KEY ??
    "";

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

  const swapIxs = await client.getSwapInstructions({
    quoteResponse: rawQuote,
    userPublicKey,
    wrapAndUnwrapSol: true,
    useSharedAccounts: true,
  });

  const instructions = [
    ...swapIxs.otherInstructions.map(metisInstructionToKit),
    ...swapIxs.setupInstructions.map(metisInstructionToKit),
    ...(swapIxs.tokenLedgerInstruction
      ? [metisInstructionToKit(swapIxs.tokenLedgerInstruction)]
      : []),
    metisInstructionToKit(swapIxs.swapInstruction),
    ...(swapIxs.cleanupInstruction
      ? [metisInstructionToKit(swapIxs.cleanupInstruction)]
      : []),
  ];

  const lookupTableAddresses = swapIxs.addressLookupTableAddresses.map((addr) =>
    address(addr),
  );
  console.log("Total instructions:", instructions.length);
  console.log("Lookup tables:", lookupTableAddresses);
  onStatus("signing");

  let lastError: unknown;
  // Step 4: Build and execute transaction
  async function executeSwapOnce(): Promise<string> {
    return new TransactionBuilder({
      rpc: rpc,
      // Simulate to set CU limit (and surface simulation logs if it fails).
      computeUnits: { strategy: "fixed", units: 300_000n },
      priorityFee: { strategy: "fixed", microLamports: 200_000n },
      autoRetry: false,
      lookupTableAddresses:
        lookupTableAddresses.length > 0 ? lookupTableAddresses : undefined,
    })
      .setFeePayerSigner(signer)
      .addInstructions(instructions)
      .execute({
        rpcSubscriptions,
        commitment: "confirmed",
        // We've already simulated for CU; skipping preflight reduces latency.
        skipPreflight: true,
      });
  }
  let signature: string;
  try {
    console.log("Executing transaction with Metis instructions...");
    signature = await executeSwapOnce();
    console.log("signature", signature);
    onStatus("sending");
    return signature;
  } catch (err) {
    lastError = err;
    if (isTemporarilyRestricted(err)) {
      console.warn("Execution temporarily restricted, retrying once...", err);
    }
    throw err;
  }

  throw lastError;
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
): Promise<TransactionPlanResult | string> {
  const [{ getTitanSwapPlan }, { executePlan }] = await Promise.all([
    import("@pipeit/actions/titan"),
    import("@pipeit/core"),
  ]);

  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { plan, lookupTableAddresses } = await getTitanSwapPlan({
        swap: {
          inputMint,
          outputMint,
          amount: inputAmount,
          slippageBps,
        },
        transaction: {
          userPublicKey,
          createOutputTokenAccount: true,
        },
      });

      onStatus("signing");

      const planResult = await executePlan(plan, {
        rpc,
        rpcSubscriptions,
        signer,
        lookupTableAddresses,
      });
      const signatures = getSignaturesFromTransactionPlanResult(planResult);
      const signature = signatures.at(-1) ?? "";

      onStatus("sending");
      return signature;
    } catch (err) {
      lastError = err;
      if (isTemporarilyRestricted(err)) {
        await waitOneSlot();
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

// ─── Main hook ────────────────────────────────────────────────────────────────

export function useSwapExecute(): UseSwapExecuteReturn {
  const { settings } = useSwapSettings();
  const { account } = useWallet();
  const { signer, ready: signerReady } = useKitTransactionSigner();
  const { client } = useSolanaClient();
const { showTxModal } = useTxModal();
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

          default:
            throw new Error(`Unknown provider: ${settings.provider}`);
        }

        setStatus("confirming");
        setTxSignature(sig as string);

        await new Promise((r) => setTimeout(r, 800));
        setStatus("success");
        // After setStatus("success"):
showTxModal({
  status: "success",
  action: `Swapped Success`,
  txSignature: sig as string,
  tokenSymbol: 'USDC',
  secondaryCta: {
    label: "View Portfolio",
    onClick: () => window.dispatchEvent(new CustomEvent("open-portfolio-drawer")),
  },
});
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Swap failed";
        setError(msg);
        showTxModal({
  status: "error",
  action: `Swap `,
  errorMessage: msg,
});
        setStatus("error");
      }
    },
    [account, signerReady, signer, client, settings],
  );

  return { swap, status, txSignature, error, reset };
}
