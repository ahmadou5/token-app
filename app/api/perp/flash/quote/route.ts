// src/app/api/trade/flash/quote/route.ts
// POST /api/trade/flash/quote
// Proxies Flash Trade's /transaction-builder/open-position
// No API key required per Flash Trade docs — kept server-side to
// avoid CORS issues and allow future auth header injection.

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FLASH_API_BASE = "https://flashapi.trade";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Required fields validation
    const {
      inputTokenSymbol,
      outputTokenSymbol,
      inputAmountUi,
      leverage,
      tradeType,
      owner,
    } = body;

    if (
      !inputTokenSymbol ||
      !outputTokenSymbol ||
      !inputAmountUi ||
      !leverage ||
      !tradeType
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Missing required fields: inputTokenSymbol, outputTokenSymbol, inputAmountUi, leverage, tradeType",
        },
        { status: 400 },
      );
    }

    if (!owner) {
      return NextResponse.json(
        {
          ok: false,
          error: "owner (wallet pubkey) is required to build a transaction",
        },
        { status: 400 },
      );
    }

    // Forward to Flash Trade — include all fields the caller sends
    const flashRes = await fetch(
      `${FLASH_API_BASE}/transaction-builder/open-position`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        // 10s timeout via AbortController
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (flashRes.status === 429) {
      return NextResponse.json(
        {
          ok: false,
          error: "Flash Trade rate limit reached. Please wait a moment.",
        },
        { status: 429 },
      );
    }

    if (!flashRes.ok) {
      const errText = await flashRes.text().catch(() => "");
      return NextResponse.json(
        {
          ok: false,
          error: `Flash Trade API error ${flashRes.status}: ${errText}`,
        },
        { status: flashRes.status },
      );
    }

    const data = await flashRes.json();

    // Flash Trade returns err field (not null) on computation failure
    if (data.err !== null && data.err !== undefined) {
      return NextResponse.json({ ok: false, error: data.err }, { status: 400 });
    }

    if (!data.transactionBase64) {
      return NextResponse.json(
        { ok: false, error: "Flash Trade did not return a transaction" },
        { status: 400 },
      );
    }

    // Normalise into the same shape as /api/trade/quote so
    // usePerpQuote / usePerpExecute don't need provider-specific logic
    return NextResponse.json({
      ok: true,
      quote: {
        // Map Flash Trade response fields → shared PerpQuote shape
        collateralAmount: parseFloat(inputAmountUi),
        collateralToken: inputTokenSymbol,
        token: outputTokenSymbol,
        leverage: data.newLeverage ? parseFloat(data.newLeverage) : leverage,
        size: data.youRecieveUsdUi
          ? parseFloat(data.youRecieveUsdUi)
          : undefined,
        entryPrice: data.newEntryPrice
          ? parseFloat(data.newEntryPrice)
          : undefined,
        liquidationPrice: data.newLiquidationPrice
          ? parseFloat(data.newLiquidationPrice)
          : undefined,
        fee: data.entryFee ? parseFloat(data.entryFee) : 0,
        takeProfit: body.takeProfit ? parseFloat(body.takeProfit) : null,
        stopLoss: body.stopLoss ? parseFloat(body.stopLoss) : null,
        // Pass through Flash-specific preview fields for UI enrichment
        availableLiquidity: data.availableLiquidity,
        youPayUsdUi: data.youPayUsdUi,
        youReceiveUsdUi: data.youRecieveUsdUi,
        openPositionFeePercent: data.openPositionFeePercent,
        marginFeePercentage: data.marginFeePercentage,
        takeProfitQuote: data.takeProfitQuote ?? null,
        stopLossQuote: data.stopLossQuote ?? null,
      },
      transaction: data.transactionBase64,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[flash/quote]", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
