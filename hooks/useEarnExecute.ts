"use client";

import { useCallback, useState } from "react";
import {
  useKitTransactionSigner,
  useSolanaClient,
  useWallet,
} from "@solana/connector";
import { useTxModal } from "@/context/TxModalContext";

export type EarnExecuteStatus =
  | "idle"
  | "signing"
  | "sending"
  | "confirming"
  | "confirmed"
  | "error";

export interface UseEarnExecuteReturn {
  execute: (
    txBase64: string,
    actionLabel: string,
    tokenSymbol: string,
    tokenAmount: string,
  ) => Promise<string | null>;
  status: EarnExecuteStatus;
  txSignature: string | null;
  error: string | null;
  reset: () => void;
}

async function waitForConfirmation(
  rpc: any,
  sig: string,
  timeoutMs = 60_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  return new Promise<void>((resolve, reject) => {
    const poll = setInterval(async () => {
      if (Date.now() > deadline) {
        clearInterval(poll);
        reject(new Error("Transaction confirmation timeout"));
        return;
      }
      try {
        const result = await rpc
          .getSignatureStatuses([sig as `${string}`])
          .send();
        const info = result?.value?.[0];
        if (
          info?.confirmationStatus === "confirmed" ||
          info?.confirmationStatus === "finalized"
        ) {
          clearInterval(poll);
          resolve();
        }
      } catch {
        // RPC hiccup
      }
    }, 1500);
  });
}

async function sendTransaction(
  txBase64: string,
  signer: any,
  rpc: any,
  rpcSubscriptions: any,
  onStatus: (s: EarnExecuteStatus) => void,
): Promise<string> {
  const [
    { TransactionBuilder },
    { address },
    { VersionedTransaction },
    { Buffer },
  ] = await Promise.all([
    import("@pipeit/core"),
    import("@solana/kit"),
    import("@solana/web3.js"),
    import("buffer"),
  ]);

  const txBytes = Buffer.from(txBase64, "base64");
  const tx = VersionedTransaction.deserialize(txBytes);
  const message = tx.message;

  // 1. Extract instructions and convert to Kit format
  const accountKeys = message.staticAccountKeys.map((k) => k.toBase58());
  const kitInstructions = message.compiledInstructions.map((ix) => {
    const programId = accountKeys[ix.programIdIndex];
    return {
      programAddress: address(programId),
      accounts: ix.accountKeyIndexes.map((idx) => {
        const isSigner = message.isAccountSigner(idx);
        const isWritable = message.isAccountWritable(idx);
        return {
          address: address(accountKeys[idx]),
          role: (isSigner ? 2 : 0) | (isWritable ? 1 : 0),
        };
      }),
      data: ix.data,
    };
  });

  // 2. Build and Execute via Pipeit
  onStatus("signing");
  const sig: string = await new (TransactionBuilder as any)({
    rpc,
    computeUnits: { strategy: "fixed", units: 400_000n },
    priorityFee: { strategy: "fixed", microLamports: 100_000n },
    autoRetry: false,
  })
    .setFeePayerSigner(signer)
    .addInstructions(kitInstructions)
    .execute({
      rpcSubscriptions: rpcSubscriptions as any,
      commitment: "confirmed",
      skipPreflight: true,
    });

  return sig;
}

export function useEarnExecute(): UseEarnExecuteReturn {
  const { account } = useWallet();
  const { signer, ready: signerReady } = useKitTransactionSigner();
  const { client } = useSolanaClient();
  const { showTxModal } = useTxModal();
  const [status, setStatus] = useState<EarnExecuteStatus>("idle");
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStatus("idle");
    setTxSignature(null);
    setError(null);
  }, []);

  const execute = useCallback(
    async (
      txBase64: string,
      actionLabel: string,
      tokenSymbol: string,
      tokenAmount: string,
    ): Promise<string | null> => {
      if (!account || !signerReady || !signer || !client) {
        setError("Wallet not connected");
        return null;
      }

      setError(null);
      setTxSignature(null);
      setStatus("signing");

      try {
        const { rpc, rpcSubscriptions } = client;

        const sig = await sendTransaction(
          txBase64,
          signer,
          rpc,
          rpcSubscriptions,
          setStatus,
        );

        setTxSignature(sig);
        setStatus("confirmed");

        showTxModal({
          status: "success",
          action: actionLabel,
          txSignature: sig,
          tokenSymbol,
          tokenAmount,
          secondaryCta: {
            label: "View Portfolio",
            onClick: () =>
              window.dispatchEvent(new CustomEvent("open-portfolio-drawer")),
          },
        });
        return sig;
      } catch (err: any) {
        const msg = err.message || "Transaction failed";
        const isUserDismissal =
          msg.toLowerCase().includes("reject") ||
          msg.toLowerCase().includes("cancel") ||
          msg.toLowerCase().includes("user rejected");
        if (!isUserDismissal) {
          setError(msg);
        }
        setStatus("error");
        return null;
      }
    },
    [account, signerReady, signer, client, showTxModal],
  );

  return { execute, status, txSignature, error, reset };
}
