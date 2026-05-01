import { NextRequest, NextResponse } from "next/server";
import {
  Connection,
  PublicKey,
  StakeProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  Authorized,
  Lockup,
} from "@solana/web3.js";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://api.mainnet-beta.solana.com";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, owner, voteAccount, amountLamports } = body;

    if (!owner || !action) {
      return NextResponse.json({ ok: false, err: "Missing required fields" }, { status: 400 });
    }

    const connection = new Connection(RPC_URL, "confirmed");
    const ownerPubkey = new PublicKey(owner);
    const transaction = new Transaction();

    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = ownerPubkey;

    if (action === "stake") {
      if (!voteAccount || !amountLamports) {
        return NextResponse.json({ ok: false, err: "Missing stake details" }, { status: 400 });
      }

      const votePubkey = new PublicKey(voteAccount);
      
      // Use a unique seed per validator to avoid collisions if they stake to multiple
      // or just a timestamp-based seed for a new account every time.
      // The user mentioned "createAccountWithSeed".
      const seed = `stake:${Math.random().toString(36).substring(2, 10)}`;
      const stakePubkey = await PublicKey.createWithSeed(
        ownerPubkey,
        seed,
        StakeProgram.programId
      );

      // Create stake account
      const createStakeAccountIx = StakeProgram.createAccountWithSeed({
        fromPubkey: ownerPubkey,
        stakePubkey,
        basePubkey: ownerPubkey,
        seed,
        authorized: new Authorized(ownerPubkey, ownerPubkey),
        lockup: new Lockup(0, 0, ownerPubkey),
        lamports: amountLamports,
      });

      // Delegate stake
      const delegateStakeIx = StakeProgram.delegate({
        stakePubkey,
        authorizedPubkey: ownerPubkey,
        votePubkey,
      });

      transaction.add(createStakeAccountIx, delegateStakeIx);
    } else if (action === "deactivate") {
      const { stakeAccount } = body;
      if (!stakeAccount) {
        return NextResponse.json({ ok: false, err: "Missing stake account" }, { status: 400 });
      }

      const deactivateIx = StakeProgram.deactivate({
        stakePubkey: new PublicKey(stakeAccount),
        authorizedPubkey: ownerPubkey,
      });

      transaction.add(deactivateIx);
    } else if (action === "withdraw") {
      const { stakeAccount, amountLamports } = body;
      if (!stakeAccount || !amountLamports) {
        return NextResponse.json({ ok: false, err: "Missing withdraw details" }, { status: 400 });
      }

      const withdrawIx = StakeProgram.withdraw({
        stakePubkey: new PublicKey(stakeAccount),
        authorizedPubkey: ownerPubkey,
        toPubkey: ownerPubkey,
        lamports: amountLamports,
      });

      transaction.add(withdrawIx);
    } else {
      return NextResponse.json({ ok: false, err: "Invalid action" }, { status: 400 });
    }

    // Return instructions instead of a serialized transaction for Pipeit TransactionBuilder
    const instructions = transaction.instructions.map(ix => ({
      programId: ix.programId.toBase58(),
      keys: ix.keys.map(k => ({
        pubkey: k.pubkey.toBase58(),
        isSigner: k.isSigner,
        isWritable: k.isWritable,
      })),
      data: ix.data.toString("base64"),
    }));

    return NextResponse.json({
      ok: true,
      instructions,
      lookupTables: [], // StakeProgram typically doesn't use LUTs
    });
  } catch (error: any) {
    console.error("[api/stake/transaction] Error:", error);
    return NextResponse.json(
      { ok: false, err: error.message || "Failed to build transaction" },
      { status: 500 }
    );
  }
}
