"use client";

import { useCallback, useState } from "react";
import {
  useKitTransactionSigner,
  useSolanaClient,
  useWallet,
} from "@solana/connector";
import { useTxModal } from "@/context/TxModalContext";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PerpExecuteStatus =
  | "idle"
  | "signing"
  | "sending"
  | "confirming"
  | "confirmed"
  | "error";

export interface UsePerpExecuteReturn {
  open: (txBase64: string,
    actionLabel?: string,
    tokenSymbol?: string,
    tokenAmount?: string,) => Promise<string | null>;
  status: PerpExecuteStatus;
  txSignature: string | null;
  error: string | null;
  reset: () => void;
}

// ─── Confirmation poller ──────────────────────────────────────────────────────
// kit RPC doesn't expose confirmTransaction directly — we poll
// getSignatureStatuses, same approach used in usePerpTx previously.

async function waitForConfirmation(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        // RPC hiccup — keep polling until deadline
      }
    }, 1500);
  });
}

// ─── Core send function ───────────────────────────────────────────────────────
// This mirrors executeJupiter in useSwapExecute.ts exactly:
//   1. Deserialize the base64 VersionedTransaction from Adrena
//   2. Sign via rawSigner.signTransaction (same cast pattern)
//   3. Send via rpc.sendTransaction().send()
//   4. Poll for confirmation via getSignatureStatuses

async function sendAdrenaTransaction(
  txBase64: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signer: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc: any,
  onStatus: (s: PerpExecuteStatus) => void,
): Promise<string> {
  // 1. Deserialize
  const { VersionedTransaction } = await import("@solana/web3.js");
  const txBytes = Buffer.from(txBase64, "base64");
  const tx = VersionedTransaction.deserialize(txBytes);

  // 2. Sign — identical cast to executeJupiter in useSwapExecute.ts
  onStatus("signing");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawSigner = signer as any;
  let signedTx: InstanceType<typeof VersionedTransaction>;
  if (typeof rawSigner.signTransaction === "function") {
    signedTx = await rawSigner.signTransaction(tx);
  } else if (typeof rawSigner.wallet?.signTransaction === "function") {
    signedTx = await rawSigner.wallet.signTransaction(tx);
  } else {
    throw new Error("Wallet does not support signTransaction");
  }

  // 3. Send via kit RPC — identical to executeJupiter
  onStatus("sending");
  const sig: string = await rpc
    .sendTransaction(signedTx.serialize(), {
      encoding: "base64",
      skipPreflight: false,
      maxRetries: 3,
    })
    .send();

  // 4. Confirm
  onStatus("confirming");
  await waitForConfirmation(rpc, sig);

  return sig;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePerpExecute(): UsePerpExecuteReturn {
  const { account } = useWallet();
  const { signer, ready: signerReady } = useKitTransactionSigner();
  const { client } = useSolanaClient();
  const { showTxModal } = useTxModal();
  const [status, setStatus] = useState<PerpExecuteStatus>("idle");
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStatus("idle");
    setTxSignature(null);
    setError(null);
  }, []);

  const open = useCallback(
    async (txBase64: string, actionLabel = "Open Position",
      tokenSymbol?: string,
      tokenAmount?: string,): Promise<string | null> => {
      if (!account || !signerReady || !signer || !client) {
        setError("Wallet not connected");
        return null;
      }

      setError(null);
      setTxSignature(null);
      setStatus("signing");

      try {
        const { rpc } = client;

        const sig = await sendAdrenaTransaction(
          txBase64,
          signer,
          rpc,
          setStatus,
        );

        setTxSignature(sig);
        setStatus("confirmed");
        // Show success toast
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
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Transaction failed";
        // Don't surface user-dismissed rejections as errors
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
    [account, signerReady, signer, client],
  );

  return { open, status, txSignature, error, reset };
}
