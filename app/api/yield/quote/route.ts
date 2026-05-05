import { NextRequest, NextResponse } from "next/server";
import { fetchYieldAPY, fetchJupiterYieldTx, fetchKaminoYieldTx, fetchMarginfiYieldTx } from "@/lib/services/yield.service";
import type { EarnProvider } from "@/context/SwapSettingsContext";

interface YieldQuoteBody {
  provider: EarnProvider;
  symbol: string;
  amountUi: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<YieldQuoteBody>;
    const provider = body.provider;
    const symbol = body.symbol;
    const amountUi = body.amountUi;

    if (
      (provider !== "kamino" &&
        provider !== "marginfi" &&
        provider !== "drift" &&
        provider !== "jupiter") ||
      typeof symbol !== "string" ||
      !symbol ||
      typeof amountUi !== "string"
    ) {
      return NextResponse.json(
        { ok: false, err: "Invalid quote payload" },
        { status: 400 },
      );
    }

    const apy = await fetchYieldAPY(provider, symbol);
    const amount = parseFloat(amountUi) || 0;
    const dailyEarningsUsd = (amount * (apy / 100)) / 365;

    let transaction: string | null = null;
    let executionAvailable = false;
    let note = "Yield execution is not wired yet. Quote is informational only.";

    const owner = (body as any).owner;
    const mint = (body as any).mint;

    if (provider === "jupiter" && owner && mint && amount > 0) {
      // For Jupiter, we use a real swap-into-LST (jupSOL) transaction
      const decimals = mint === "So11111111111111111111111111111111111111112" ? 9 : 6; // Default to 6 for SPL, 9 for SOL
      const rawAmount = Math.floor(amount * Math.pow(10, decimals));
      const action = (body as any).action || "deposit";
      
      transaction = await fetchJupiterYieldTx({
        owner,
        inputMint: mint === "So11111111111111111111111111111111111111112" 
          ? "So11111111111111111111111111111111111111112" 
          : mint,
        amount: rawAmount,
        action,
      });

      if (transaction) {
        executionAvailable = true;
        note = `Executing ${action} into Jupiter jupSOL vault via Jupiter Swap.`;
      }
    } else if (provider === "kamino" && owner && mint && amount > 0) {
      // Native Kamino Lending Integration
      const decimals = mint === "So11111111111111111111111111111111111111112" ? 9 : 6;
      const rawAmount = Math.floor(amount * Math.pow(10, decimals));
      const action = (body as any).action || "deposit";

      transaction = await fetchKaminoYieldTx({
        owner,
        inputMint: mint,
        amount: rawAmount,
        action,
      });

      if (transaction) {
        executionAvailable = true;
        note = `Executing native ${action} on Kamino Finance Main Market.`;
      }
    } else if (provider === "marginfi" && owner && mint && amount > 0) {
      // Native Marginfi Lending Integration
      const decimals = mint === "So11111111111111111111111111111111111111112" ? 9 : 6;
      const rawAmount = Math.floor(amount * Math.pow(10, decimals));
      const action = (body as any).action || "deposit";

      transaction = await fetchMarginfiYieldTx({
        owner,
        inputMint: mint,
        amount: rawAmount,
        action,
      });

      if (transaction) {
        executionAvailable = true;
        note = `Executing native ${action} on Marginfi v2.`;
      } else {
        note = `Could not find an active Marginfi account for this wallet. Please create one on marginfi.com first.`;
      }
    }

    return NextResponse.json({
      ok: true,
      quote: {
        apy,
        dailyEarningsUsd,
        protocolFeePercent: 0.1,
        provider,
      },
      transaction,
      executionAvailable,
      note,
      err: null,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch quote";
    console.error("[api/yield/quote] Error:", error);
    return NextResponse.json(
      { ok: false, err: message },
      { status: 500 }
    );
  }
}
