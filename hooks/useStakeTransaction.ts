"use client";

import { useCallback, useState } from "react";
import {
  useKitTransactionSigner,
  useSolanaClient,
  useWallet,
} from "@solana/connector";
import { useTxModal } from "@/context/TxModalContext";
import { PublicKey } from "@solana/web3.js";

export type StakeTransactionStatus =
  | "idle"
  | "loading"
  | "signing"
  | "sending"
  | "confirming"
  | "confirmed"
  | "error";

export interface StakePosition {
  address: string;
  validator: string;
  amount: number;
  status: "active" | "activating" | "deactivating" | "inactive";
}


export function useStakeTransaction() {
  const { account } = useWallet();
  const { signer, ready: signerReady } = useKitTransactionSigner();
  const { client } = useSolanaClient();
  const { showTxModal } = useTxModal();

  const [status, setStatus] = useState<StakeTransactionStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  const executeStakeAction = useCallback(async (
    action: "stake" | "deactivate" | "withdraw",
    params: { voteAccount?: string; amountSOL?: number; stakeAccount?: string }
  ) => {
    if (!account || !signerReady || !signer || !client) {
      setError("Wallet not connected");
      return null;
    }

    setStatus("loading");
    setError(null);

    try {
      // 1. Lazy imports for Pipeit and Kit
      const [
        { TransactionBuilder },
        { address },
      ] = await Promise.all([
        import("@pipeit/core"),
        import("@solana/kit"),
      ]);

      // 2. Get instructions from API
      const res = await fetch("/api/stake/transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          owner: account,
          voteAccount: params.voteAccount,
          amountLamports: params.amountSOL ? Math.floor(params.amountSOL * 1e9) : undefined,
          stakeAccount: params.stakeAccount,
        }),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.err || "Failed to build transaction");

      // 3. Convert API instructions to Solana Kit IInstruction
      const { Buffer } = await import("buffer");
      const kitInstructions = data.instructions.map((ix: any) => ({
        programAddress: address(ix.programId),
        accounts: ix.keys.map((k: any) => ({
          address: address(k.pubkey),
          role: (k.isSigner ? 2 : 0) | (k.isWritable ? 1 : 0),
        })),
        data: Buffer.from(ix.data, "base64"),
      }));

      setStatus("signing");
      
      // 4. Build and Execute via Pipeit TransactionBuilder
      const { rpc, rpcSubscriptions } = client;
      const sig: string = await new (TransactionBuilder as any)({
        rpc,
        computeUnits: { strategy: "fixed", units: 200_000n },
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

      setStatus("confirmed");
      showTxModal({
        status: "success",
        action: action === "stake" ? "Stake SOL" : action === "deactivate" ? "Unstake SOL" : "Withdraw SOL",
        txSignature: sig,
        tokenSymbol: "SOL",
        tokenAmount: params.amountSOL?.toString(),
        secondaryCta: {
          label: "View Portfolio",
          onClick: () => window.dispatchEvent(new CustomEvent("open-portfolio-drawer")),
        },
      });

      return sig;
    } catch (err: any) {
      const msg = err.message || "Action failed";
      const isUserDismissal = msg.toLowerCase().includes("reject") || msg.toLowerCase().includes("cancel");
      if (!isUserDismissal) setError(msg);
      setStatus("error");
      return null;
    }
  }, [account, signerReady, signer, client, showTxModal]);

  const fetchActiveStakes = useCallback(async (wallet: string): Promise<StakePosition[]> => {
    if (!client) return [];
    try {
      const { rpc } = client;
      const { address: kitAddress } = await import("@solana/kit");
      
      // Stake program ID string
      const STAKE_PROGRAM_ID = "Stake11111111111111111111111111111111111111";
      
      const res = await rpc.getProgramAccounts(kitAddress(STAKE_PROGRAM_ID), {
        filters: [
          { dataSize: 200n },
          { memcmp: { offset: 12n, bytes: wallet as any, encoding: "base58" } }
        ],
        encoding: "base64",
      }).send();

      // Helper to read UInt32LE from Uint8Array
      const readUInt32LE = (u8: Uint8Array, offset: number) => {
        return u8[offset] | (u8[offset + 1] << 8) | (u8[offset + 2] << 16) | (u8[offset + 3] << 24);
      };

      const { PublicKey } = await import("@solana/web3.js");
      const { Buffer } = await import("buffer");

      return res?.map((item: any) => {
        const dataU8 = Buffer.from(item.account.data[0], "base64");
        
        // State is at offset 0 (4 bytes)
        // 0: Uninitialized, 1: Initialized, 2: Delegated
        const state = readUInt32LE(dataU8, 0);
        
        // Delegated vote account is at offset 124 (32 bytes)
        let voteAccount = "";
        if (state === 2) {
          voteAccount = new PublicKey(dataU8.slice(124, 156)).toBase58();
        }
        
        return {
          address: item.pubkey,
          validator: voteAccount ? voteAccount.slice(0, 8) + "…" : "Inactive", 
          amount: Number(item.account.lamports) / 1e9,
          status: state === 2 ? "active" : "inactive",
        };
      });
    } catch (err) {
      console.error("Error fetching stakes:", err);
      return [];
    }
  }, [client]);

  return { executeStakeAction, fetchActiveStakes, status, error, reset };
}
