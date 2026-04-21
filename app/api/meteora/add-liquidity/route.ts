import { AccountMeta, TransactionInstruction } from "@solana/web3.js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, ...params } = body; // type: "dlmm" | "damm"

    if (type === "dlmm") {
      const DLMM = await import("@meteora-ag/dlmm");
      const { Connection, PublicKey } = await import("@solana/web3.js");
      const { default: BN } = await import("bn.js");

      const connection = new Connection(params.rpcEndpoint, "confirmed");
      const poolPubkey = new PublicKey(params.poolAddress);
      const userPubkey = new PublicKey(params.userPublicKey);

      const dlmmPool = await DLMM.default.create(connection, poolPubkey);
      const activeBin = await dlmmPool.getActiveBin();

      const minBinId = activeBin.binId - params.binRange;
      const maxBinId = activeBin.binId + params.binRange;

      const strategyMap: Record<string, number> = {
        spot: 0,
        curve: 1,
        bid_ask: 2,
      };

      const addLiqTx = await dlmmPool.addLiquidityByStrategy({
        positionPubKey: userPubkey,
        user: userPubkey,
        totalXAmount: new BN(params.amountX),
        totalYAmount: new BN(params.amountY),
        strategy: {
          maxBinId,
          minBinId,
          strategyType: strategyMap[params.strategy] ?? 0,
        },
      });

      // Return serialized instructions to be signed client-side
      const serialized = addLiqTx.instructions.map(
        (ix: TransactionInstruction) => ({
          programId: ix.programId.toBase58(),
          keys: ix.keys.map((k: AccountMeta) => ({
            pubkey: k.pubkey.toBase58(),
            isSigner: k.isSigner,
            isWritable: k.isWritable,
          })),
          data: Buffer.from(ix.data).toString("base64"),
        }),
      );

      return NextResponse.json({ instructions: serialized });
    }

    if (type === "damm") {
      const AmmImpl = await import("@mercurial-finance/dynamic-amm-sdk");
      const { Connection, PublicKey } = await import("@solana/web3.js");
      const { default: BN } = await import("bn.js");

      const connection = new Connection(params.rpcEndpoint, "confirmed");
      const poolPubkey = new PublicKey(params.poolAddress);
      const userPubkey = new PublicKey(params.userPublicKey);

      const amm = await AmmImpl.default.create(connection, poolPubkey);

      const { instructions } = await amm.deposit(
        userPubkey,
        new BN(params.amountA),
        new BN(params.amountB),
        new BN(0),
      );

      const serialized = instructions.map((ix: TransactionInstruction) => ({
        programId: ix.programId.toBase58(),
        keys: ix.keys.map((k: AccountMeta) => ({
          pubkey: k.pubkey.toBase58(),
          isSigner: k.isSigner,
          isWritable: k.isWritable,
        })),
        data: Buffer.from(ix.data).toString("base64"),
      }));

      return NextResponse.json({ instructions: serialized });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "An unknown error occurred" },
      { status: 500 },
    );
  }
}
