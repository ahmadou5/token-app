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
  onStatus: (s: EarnExecuteStatus) => void,
): Promise<string> {
  const { VersionedTransaction } = await import("@solana/web3.js");
  const txBytes = Buffer.from(txBase64, "base64");
  const tx = VersionedTransaction.deserialize(txBytes);

  onStatus("signing");
  const rawSigner = signer as any;
  let signedTx: InstanceType<typeof VersionedTransaction>;
  if (typeof rawSigner.signTransaction === "function") {
    signedTx = await rawSigner.signTransaction(tx);
  } else if (typeof rawSigner.wallet?.signTransaction === "function") {
    signedTx = await rawSigner.wallet.signTransaction(tx);
  } else {
    throw new Error("Wallet does not support signTransaction");
  }

  onStatus("sending");
  const sig: string = await rpc
    .sendTransaction(signedTx.serialize(), {
      encoding: "base64",
      skipPreflight: false,
      maxRetries: 3,
    })
    .send();

  onStatus("confirming");
  await waitForConfirmation(rpc, sig);

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
        const { rpc } = client;

        const sig = await sendTransaction(
          txBase64,
          signer,
          rpc,
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
