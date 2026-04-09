"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  useWallet,
  useConnectWallet,
  useKitTransactionSigner,
  useSolanaClient,
  useWalletConnectors,
  useBalance,
} from "@solana/connector";
import { VersionedTransaction } from "@solana/web3.js";

// ─── Known tokens ────────────────────────────────────────────────────────────

const KNOWN_TOKENS: Record<
  string,
  { symbol: string; name: string; logo?: string }
> = {
  So11111111111111111111111111111111111111112: {
    symbol: "SOL",
    name: "Solana",
    logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
  },
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
    symbol: "USDC",
    name: "USD Coin",
    logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
  },
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: {
    symbol: "USDT",
    name: "Tether USD",
    logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png",
  },
  mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So: {
    symbol: "mSOL",
    name: "Marinade SOL",
    logo: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png",
  },
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: {
    symbol: "BONK",
    name: "Bonk",
    logo: "https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I",
  },
};

const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SOL_MINT = "So11111111111111111111111111111111111111112";

const DEFAULT_INPUT_OPTIONS = [
  { mint: SOL_MINT, ...KNOWN_TOKENS[SOL_MINT] },
  { mint: USDC_MINT, ...KNOWN_TOKENS[USDC_MINT] },
  {
    mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    ...KNOWN_TOKENS["Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"],
  },
  {
    mint: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
    ...KNOWN_TOKENS["mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So"],
  },
  {
    mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    ...KNOWN_TOKENS["DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"],
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type SwapTab = "spot" | "perp";

interface TokenOption {
  mint: string;
  symbol: string;
  name: string;
  logo?: string;
}

interface SwapQuote {
  inputAmount: bigint;
  outputAmount: bigint;
  priceImpact: number;
  fee: number;
  route: string[];
}

interface SwapState {
  status:
    | "idle"
    | "fetching-quote"
    | "ready"
    | "swapping"
    | "success"
    | "error";
  quote: SwapQuote | null;
  error: string | null;
  txSignature: string | null;
}

// ─── Token Avatar ─────────────────────────────────────────────────────────────

function TokenLogo({
  logo,
  symbol,
  size = 24,
}: {
  logo?: string;
  symbol: string;
  size?: number;
}) {
  const [err, setErr] = useState(false);
  if (logo && !err) {
    return (
      <img
        src={logo}
        alt={symbol}
        width={size}
        height={size}
        className="sw-token-logo"
        onError={() => setErr(true)}
      />
    );
  }
  return (
    <div
      className="sw-token-logo sw-token-logo--fallback"
      style={{ width: size, height: size }}
    >
      {symbol.slice(0, 2)}
    </div>
  );
}

// ─── Token Select Dropdown ────────────────────────────────────────────────────

function TokenSelect({
  value,
  options,
  onChange,
  excludeMint,
}: {
  value: TokenOption;
  options: TokenOption[];
  onChange: (t: TokenOption) => void;
  excludeMint?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const filtered = options.filter((t) => t.mint !== excludeMint);

  return (
    <div className="sw-token-select" ref={ref}>
      <button className="sw-token-trigger" onClick={() => setOpen((o) => !o)}>
        <TokenLogo logo={value.logo} symbol={value.symbol} size={20} />
        <span className="sw-token-trigger__sym">{value.symbol}</span>
        <svg
          viewBox="0 0 10 6"
          fill="none"
          width="10"
          height="6"
          className={`sw-token-trigger__chev ${open ? "sw-token-trigger__chev--open" : ""}`}
        >
          <path
            d="M1 1l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="sw-token-dropdown">
          {filtered.map((t) => (
            <button
              key={t.mint}
              className={`sw-token-option ${t.mint === value.mint ? "sw-token-option--active" : ""}`}
              onClick={() => {
                onChange(t);
                setOpen(false);
              }}
            >
              <TokenLogo logo={t.logo} symbol={t.symbol} size={20} />
              <div className="sw-token-option__text">
                <span className="sw-token-option__sym">{t.symbol}</span>
                <span className="sw-token-option__name">{t.name}</span>
              </div>
              {t.mint === value.mint && (
                <svg
                  viewBox="0 0 12 12"
                  fill="none"
                  width="12"
                  height="12"
                  className="sw-token-option__check"
                >
                  <path
                    d="M2 6l3 3 5-5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Slippage Picker ──────────────────────────────────────────────────────────

function SlippageControl({
  slippage,
  onChange,
}: {
  slippage: number;
  onChange: (v: number) => void;
}) {
  const [custom, setCustom] = useState(false);
  const [customVal, setCustomVal] = useState("");
  const presets = [0.1, 0.5, 1.0];

  return (
    <div className="sw-slippage">
      <span className="sw-slippage__label">Slippage</span>
      <div className="sw-slippage__pills">
        {presets.map((p) => (
          <button
            key={p}
            className={`sw-slippage__pill ${!custom && slippage === p ? "sw-slippage__pill--active" : ""}`}
            onClick={() => {
              setCustom(false);
              onChange(p);
              setCustomVal("");
            }}
          >
            {p}%
          </button>
        ))}
        <div
          className={`sw-slippage__custom ${custom ? "sw-slippage__custom--active" : ""}`}
        >
          <input
            type="number"
            placeholder="Custom"
            value={customVal}
            min="0.01"
            max="50"
            step="0.1"
            className="sw-slippage__input"
            onFocus={() => setCustom(true)}
            onChange={(e) => {
              setCustomVal(e.target.value);
              const n = parseFloat(e.target.value);
              if (!isNaN(n) && n > 0 && n <= 50) onChange(n);
            }}
          />
          {custom && <span className="sw-slippage__pct">%</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Wallet Connect Gate ──────────────────────────────────────────────────────

function ConnectWalletPrompt() {
  const connectors = useWalletConnectors();
  const { connect, isConnecting } = useConnectWallet();
  const [showList, setShowList] = useState(false);

  const installed = connectors.filter((c) => c.ready !== false);
  const toShow = installed.length > 0 ? installed : connectors.slice(0, 4);

  if (!showList) {
    return (
      <button className="sw-connect-btn" onClick={() => setShowList(true)}>
        <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
          <path
            d="M17 10.5V14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2h3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M13 3h4m0 0v4m0-4L10 10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Connect Wallet to Swap
      </button>
    );
  }

  return (
    <div className="sw-wallet-list">
      <p className="sw-wallet-list__label">Choose a wallet</p>
      {toShow.map((c) => (
        <button
          key={c.id}
          className="sw-wallet-item"
          disabled={isConnecting}
          onClick={() => connect(c.id)}
        >
          {c.icon && (
            <img
              src={c.icon}
              alt={c.name}
              width={24}
              height={24}
              className="sw-wallet-item__icon"
            />
          )}
          <span className="sw-wallet-item__name">{c.name}</span>
          {isConnecting && (
            <span className="sw-wallet-item__spin" aria-hidden />
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Perp Placeholder ────────────────────────────────────────────────────────

function PerpTab({
  tokenName,
  tokenSymbol,
}: {
  tokenName: string;
  tokenSymbol?: string;
}) {
  return (
    <div className="sw-perp-placeholder">
      <svg
        viewBox="0 0 48 48"
        fill="none"
        width="40"
        height="40"
        className="sw-perp-placeholder__icon"
      >
        <rect
          x="4"
          y="20"
          width="40"
          height="8"
          rx="4"
          fill="var(--tc-accent)"
          opacity="0.12"
        />
        <path
          d="M4 24h40M24 8v32"
          stroke="var(--tc-accent)"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.5"
        />
        <circle cx="24" cy="24" r="5" fill="var(--tc-accent)" opacity="0.8" />
        <path
          d="M14 16l10 8-10 8M34 16L24 24l10 8"
          stroke="var(--tc-accent)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.5"
        />
      </svg>
      <p className="sw-perp-placeholder__title">Perpetuals coming soon</p>
      <p className="sw-perp-placeholder__sub">
        Long / short {tokenSymbol ?? tokenName} with leverage.
        <br />
        {`We're integrating perp protocols now.`}
      </p>
      <button className="sw-perp-notify">Notify me</button>
    </div>
  );
}

// ─── Quote row ────────────────────────────────────────────────────────────────

function QuoteInfo({
  quote,
  inputToken,
  outputToken,
  slippage,
}: {
  quote: SwapQuote;
  inputToken: TokenOption;
  outputToken: TokenOption;
  slippage: number;
}) {
  const rate = Number(quote.outputAmount) / Number(quote.inputAmount);
  const minOut = Number(quote.outputAmount) * (1 - slippage / 100);

  function fmt(n: number, dec = 6) {
    if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
    return n.toFixed(Math.min(dec, 6));
  }

  return (
    <div className="sw-quote">
      <div className="sw-quote__row">
        <span className="sw-quote__label">Rate</span>
        <span className="sw-quote__value">
          1 {inputToken.symbol} ≈ {fmt(rate)} {outputToken.symbol}
        </span>
      </div>
      <div className="sw-quote__row">
        <span className="sw-quote__label">Min received</span>
        <span className="sw-quote__value">
          {fmt(minOut)} {outputToken.symbol}
        </span>
      </div>
      <div className="sw-quote__row">
        <span className="sw-quote__label">Price impact</span>
        <span
          className={`sw-quote__value ${quote.priceImpact > 2 ? "sw-quote__value--warn" : ""}`}
        >
          {quote.priceImpact.toFixed(2)}%
        </span>
      </div>
      <div className="sw-quote__row">
        <span className="sw-quote__label">Fee</span>
        <span className="sw-quote__value">{(quote.fee * 100).toFixed(2)}%</span>
      </div>
      {quote.route.length > 0 && (
        <div className="sw-quote__row">
          <span className="sw-quote__label">Route</span>
          <span className="sw-quote__value sw-quote__value--route">
            {quote.route.join(" → ")}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Main SpotSwap Component ──────────────────────────────────────────────────

export function SpotSwap({
  outputMint,
  outputSymbol,
  outputName,
  outputLogo,
}: {
  outputMint: string;
  outputSymbol?: string;
  outputName: string;
  outputLogo?: string;
}) {
  const { isConnected, account } = useWallet();
  const { signer, ready: signerReady } = useKitTransactionSigner();
  const { client } = useSolanaClient();
  const { tokens: walletTokens } = useBalance({ enabled: isConnected });

  // ── Tabs ──
  const [activeTab, setActiveTab] = useState<SwapTab>("spot");

  // ── Token state ──
  const outputToken: TokenOption = {
    mint: outputMint,
    symbol: outputSymbol ?? outputName.slice(0, 6).toUpperCase(),
    name: outputName,
    logo: outputLogo,
  };

  const [inputToken, setInputToken] = useState<TokenOption>(
    DEFAULT_INPUT_OPTIONS.find((t) => t.mint === USDC_MINT) ??
      DEFAULT_INPUT_OPTIONS[0],
  );

  const [inputAmount, setInputAmount] = useState("");
  const [slippage, setSlippage] = useState(0.5);
  const [showSettings, setShowSettings] = useState(false);
  const [swapState, setSwapState] = useState<SwapState>({
    status: "idle",
    quote: null,
    error: null,
    txSignature: null,
  });

  // ── Build available input options (exclude output token) ──
  const inputOptions = [
    ...DEFAULT_INPUT_OPTIONS,
    // Add output token's mint if it's not already there and not the outputMint
  ].filter((t) => t.mint !== outputMint);

  // Adjust inputToken if it matches outputMint (edge case when navigating between tokens)
  useEffect(() => {
    if (inputToken.mint === outputMint) {
      const fallback = inputOptions.find((t) => t.mint !== outputMint);
      if (fallback) setInputToken(fallback);
    }
  }, [outputMint]);

  // ── Get user's balance for input token ──
  const inputBalance = Number(walletTokens[0]?.amount);
  const solBalance =
    inputToken.mint === SOL_MINT ? Number(walletTokens[0]?.amount) : null;
  const displayBalance =
    solBalance !== null
      ? solBalance.toFixed(4)
      : inputBalance
        ? inputBalance
        : null;

  // ── Quote debounce ────────────────────────────────────────────────────────
  const quoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchQuote = useCallback(
    async (amount: string, inToken: TokenOption) => {
      const parsed = parseFloat(amount);
      if (!amount || isNaN(parsed) || parsed <= 0) {
        setSwapState((s) => ({
          ...s,
          status: "idle",
          quote: null,
          error: null,
        }));
        return;
      }

      setSwapState((s) => ({
        ...s,
        status: "fetching-quote",
        quote: null,
        error: null,
      }));

      try {
        // Call Jupiter Quote API (the backbone of most Solana DEX aggregators incl. Titan/Metis)
        const inDecimals = inToken.mint === SOL_MINT ? 9 : 6; // USDC/USDT = 6, SOL = 9
        const amountIn = BigInt(Math.floor(parsed * 10 ** inDecimals));

        const url = new URL("https://quote-api.jup.ag/v6/quote");
        url.searchParams.set("inputMint", inToken.mint);
        url.searchParams.set("outputMint", outputMint);
        url.searchParams.set("amount", amountIn.toString());
        url.searchParams.set(
          "slippageBps",
          Math.round(slippage * 100).toString(),
        );
        url.searchParams.set("onlyDirectRoutes", "false");

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error(`Quote API error: ${res.status}`);
        const data = await res.json();

        if (data.error) throw new Error(data.error);

        const outDecimals =
          KNOWN_TOKENS[outputMint]?.symbol === "USDC" ||
          KNOWN_TOKENS[outputMint]?.symbol === "USDT"
            ? 6
            : 9;
        const outAmount = BigInt(data.outAmount ?? "0");

        // Extract route labels
        const route: string[] = (data.routePlan ?? [])
          .slice(0, 3)
          .map(
            (r: { swapInfo?: { label?: string } }) =>
              r.swapInfo?.label ?? "DEX",
          )
          .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i);

        setSwapState({
          status: "ready",
          quote: {
            inputAmount: amountIn,
            outputAmount: outAmount,
            priceImpact: parseFloat(data.priceImpactPct ?? "0") * 100,
            fee: 0.003,
            route,
          },
          error: null,
          txSignature: null,
        });
      } catch (err) {
        setSwapState({
          status: "error",
          quote: null,
          error: err instanceof Error ? err.message : "Failed to fetch quote",
          txSignature: null,
        });
      }
    },
    [outputMint, slippage],
  );

  useEffect(() => {
    if (quoteTimer.current) clearTimeout(quoteTimer.current);
    quoteTimer.current = setTimeout(
      () => fetchQuote(inputAmount, inputToken),
      600,
    );
    return () => {
      if (quoteTimer.current) clearTimeout(quoteTimer.current);
    };
  }, [inputAmount, inputToken, outputMint, slippage, fetchQuote]);

  // ── Swap execution ─────────────────────────────────────────────────────────
  const handleSwap = useCallback(async () => {
    if (
      !swapState.quote ||
      !isConnected ||
      !account ||
      !client ||
      !signerReady ||
      !signer
    )
      return;

    setSwapState((s) => ({ ...s, status: "swapping", error: null }));

    try {
      // 1. Get swap transaction from Jupiter
      const quoteRes = await fetch(
        "https://quote-api.jup.ag/v6/quote?" +
          new URLSearchParams({
            inputMint: inputToken.mint,
            outputMint,
            amount: swapState.quote.inputAmount.toString(),
            slippageBps: Math.round(slippage * 100).toString(),
          }),
      );
      const quoteData = await quoteRes.json();

      const swapRes = await fetch("https://quote-api.jup.ag/v6/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteResponse: quoteData,
          userPublicKey: account,
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: "auto",
        }),
      });
      const swapData = await swapRes.json();
      if (swapData.error) throw new Error(swapData.error);

      // 2. Deserialize and sign the transaction
      const txBytes = Buffer.from(swapData.swapTransaction, "base64");
      const { VersionedTransaction } = await import("@solana/web3.js");
      const tx = VersionedTransaction.deserialize(txBytes);

      // 3. Sign using @solana/connector signer (kit-compatible)
      // The connector's TransactionModifyingSigner wraps the wallet adapter
      // We use the raw transaction signing approach compatible with VersionedTransaction
      const { signTransaction } = signer as unknown as {
        signTransaction: (
          tx: VersionedTransaction,
        ) => Promise<VersionedTransaction>;
      };

      let signedTx: VersionedTransaction;
      if (typeof signTransaction === "function") {
        signedTx = await signTransaction(tx);
      } else {
        // Fallback: use wallet standard signTransaction
        throw new Error(
          "Wallet does not support transaction signing in this context",
        );
      }

      // 4. Send via RPC
      const { rpc } = client;
      const sig = await (
        rpc as unknown as {
          sendTransaction: (
            tx: Uint8Array,
            opts: {
              encoding: string;
              skipPreflight: boolean;
              maxRetries: number;
            },
          ) => { send: () => Promise<string> };
        }
      )
        .sendTransaction(signedTx.serialize(), {
          encoding: "base64",
          skipPreflight: false,
          maxRetries: 3,
        })
        .send();

      setSwapState({
        status: "success",
        quote: swapState.quote,
        error: null,
        txSignature: sig,
      });

      // Reset after 4s
      setTimeout(() => {
        setSwapState({
          status: "idle",
          quote: null,
          error: null,
          txSignature: null,
        });
        setInputAmount("");
      }, 4000);
    } catch (err) {
      setSwapState((s) => ({
        ...s,
        status: "error",
        error: err instanceof Error ? err.message : "Swap failed",
      }));
    }
  }, [
    swapState.quote,
    isConnected,
    account,
    client,
    signerReady,
    signer,
    inputToken,
    outputMint,
    slippage,
  ]);

  // ── Max button ────────────────────────────────────────────────────────────
  function handleMax() {
    if (displayBalance) {
      // Leave a small SOL buffer for fees
      const val =
        inputToken.mint === SOL_MINT
          ? Math.max(0, parseFloat(displayBalance as string) - 0.01).toFixed(4)
          : displayBalance;
      setInputAmount(val as string);
    }
  }

  // ── Swap tokens direction ─────────────────────────────────────────────────
  // (output token is fixed as the page token, so we can only toggle input token display)
  function handleFlip() {
    // Nothing to flip since output is always fixed — we reset input amount
    setInputAmount("");
    setSwapState({
      status: "idle",
      quote: null,
      error: null,
      txSignature: null,
    });
  }

  // ── Computed output display ───────────────────────────────────────────────
  const outputDecimals =
    outputToken.symbol === "USDC" || outputToken.symbol === "USDT" ? 6 : 9;
  const outputDisplay = swapState.quote
    ? (Number(swapState.quote.outputAmount) / 10 ** outputDecimals)
        .toFixed(6)
        .replace(/\.?0+$/, "")
    : "";

  const canSwap =
    isConnected &&
    swapState.status === "ready" &&
    swapState.quote !== null &&
    parseFloat(inputAmount) > 0;

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <>
      <div className="sw-card">
        {/* ── Tabs ── */}
        <div className="sw-tabs">
          {(["spot", "perp"] as SwapTab[]).map((tab) => (
            <button
              key={tab}
              className={`sw-tab ${activeTab === tab ? "sw-tab--active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "spot" ? (
                <>
                  <svg viewBox="0 0 14 14" fill="none" width="12" height="12">
                    <path
                      d="M2 10l4-6 3 4 2-3 3 5"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Spot
                </>
              ) : (
                <>
                  <svg viewBox="0 0 14 14" fill="none" width="12" height="12">
                    <path
                      d="M7 2v10M2 7h10"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                    />
                    <circle
                      cx="7"
                      cy="7"
                      r="2.5"
                      stroke="currentColor"
                      strokeWidth="1.3"
                    />
                  </svg>
                  Perp
                  <span className="sw-tab__badge">Soon</span>
                </>
              )}
            </button>
          ))}

          {/* Settings gear */}
          {activeTab === "spot" && (
            <button
              className={`sw-settings-btn ${showSettings ? "sw-settings-btn--active" : ""}`}
              onClick={() => setShowSettings((s) => !s)}
              aria-label="Swap settings"
            >
              <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                <circle
                  cx="8"
                  cy="8"
                  r="2.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                />
                <path
                  d="M8 1.5v1.2M8 13.3v1.2M1.5 8h1.2M13.3 8h1.2M3.4 3.4l.85.85M11.75 11.75l.85.85M3.4 12.6l.85-.85M11.75 4.25l.85-.85"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>

        {/* ── Settings panel (slippage) ── */}
        {activeTab === "spot" && showSettings && (
          <div className="sw-settings-panel">
            <SlippageControl slippage={slippage} onChange={setSlippage} />
          </div>
        )}

        {/* ── Spot content ── */}
        {activeTab === "spot" && (
          <>
            {/* Input box */}
            <div className="sw-input-group">
              <div className="sw-input-header">
                <span className="sw-input-label">You pay</span>
                {isConnected && displayBalance && (
                  <button className="sw-balance-btn" onClick={handleMax}>
                    Bal: {parseFloat(displayBalance as string).toFixed(4)}{" "}
                    {inputToken.symbol}
                  </button>
                )}
              </div>
              <div className="sw-input-row">
                <input
                  type="number"
                  className="sw-amount-input"
                  placeholder="0.00"
                  value={inputAmount}
                  min="0"
                  onChange={(e) => setInputAmount(e.target.value)}
                />
                <TokenSelect
                  value={inputToken}
                  options={inputOptions}
                  onChange={setInputToken}
                  excludeMint={outputMint}
                />
              </div>
            </div>

            {/* Flip arrow */}
            <div className="sw-flip-row">
              <div className="sw-divider-line" />
              <button
                className="sw-flip-btn"
                onClick={handleFlip}
                aria-label="Flip tokens"
              >
                <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
                  <path
                    d="M4 2v12M4 14l-3-3M4 14l3-3M12 14V2M12 2l-3 3M12 2l3 3"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <div className="sw-divider-line" />
            </div>

            {/* Output box */}
            <div className="sw-output-group">
              <div className="sw-input-header">
                <span className="sw-input-label">You receive</span>
                {swapState.status === "fetching-quote" && (
                  <span className="sw-fetching">Fetching quote…</span>
                )}
              </div>
              <div className="sw-input-row sw-input-row--output">
                <span
                  className={`sw-amount-output ${!outputDisplay ? "sw-amount-output--empty" : ""}`}
                >
                  {outputDisplay || "0.00"}
                </span>
                <div className="sw-token-fixed">
                  <TokenLogo
                    logo={outputToken.logo}
                    symbol={outputToken.symbol}
                    size={20}
                  />
                  <span className="sw-token-fixed__sym">
                    {outputToken.symbol}
                  </span>
                </div>
              </div>
            </div>

            {/* Quote details */}
            {swapState.status === "ready" && swapState.quote && (
              <QuoteInfo
                quote={swapState.quote}
                inputToken={inputToken}
                outputToken={outputToken}
                slippage={slippage}
              />
            )}

            {/* Error */}
            {swapState.status === "error" && swapState.error && (
              <div className="sw-error">
                <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
                  <circle
                    cx="8"
                    cy="8"
                    r="6.5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M8 5v3.5M8 10.5v.5"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
                {swapState.error}
              </div>
            )}

            {/* Success */}
            {swapState.status === "success" && swapState.txSignature && (
              <div className="sw-success">
                <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
                  <circle
                    cx="8"
                    cy="8"
                    r="6.5"
                    fill="var(--tc-accent-up)"
                    opacity="0.15"
                  />
                  <circle
                    cx="8"
                    cy="8"
                    r="6.5"
                    stroke="var(--tc-accent-up)"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M5 8l2 2 4-4"
                    stroke="var(--tc-accent-up)"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Swap successful!{" "}
                <a
                  href={`https://solscan.io/tx/${swapState.txSignature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sw-success__link"
                >
                  View tx
                </a>
              </div>
            )}

            {/* CTA */}
            {!isConnected ? (
              <ConnectWalletPrompt />
            ) : (
              <button
                className={`sw-swap-btn ${swapState.status === "swapping" ? "sw-swap-btn--loading" : ""}`}
                disabled={!canSwap || swapState.status === "swapping"}
                onClick={handleSwap}
              >
                {swapState.status === "swapping" ? (
                  <>
                    <span className="sw-swap-btn__spinner" aria-hidden />
                    Swapping…
                  </>
                ) : swapState.status === "fetching-quote" ? (
                  "Fetching quote…"
                ) : !inputAmount || parseFloat(inputAmount) <= 0 ? (
                  "Enter amount"
                ) : swapState.status === "error" ? (
                  "Retry"
                ) : (
                  <>
                    Swap {inputToken.symbol}
                    <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
                      <path
                        d="M3 8h10M9 4l4 4-4 4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {outputToken.symbol}
                  </>
                )}
              </button>
            )}

            {/* Powered by */}
            <div className="sw-powered">
              <span>Powered by</span>
              <svg viewBox="0 0 40 12" fill="none" width="40" height="12">
                <text
                  x="0"
                  y="10"
                  fontSize="10"
                  fontWeight="600"
                  fill="var(--tc-text-muted)"
                  fontFamily="monospace"
                >
                  Jupiter
                </text>
              </svg>
            </div>
          </>
        )}

        {/* ── Perp content ── */}
        {activeTab === "perp" && (
          <PerpTab tokenName={outputName} tokenSymbol={outputSymbol} />
        )}
      </div>
    </>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
