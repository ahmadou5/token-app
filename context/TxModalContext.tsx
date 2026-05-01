"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TxModalPayload {
  status: "success" | "error";
  /** Human-readable label e.g. "Swapped 100 USDC → 0.67 SOL" */
  action: string;
  /** Token symbol shown in the amount pill e.g. "SOL" */
  tokenSymbol?: string;
  /** Token amount shown in the amount pill e.g. "0.67" */
  tokenAmount?: string;
  /** Token logo URL */
  tokenLogo?: string;
  txSignature?: string;
  errorMessage?: string;
  onRetry?: () => void;
  /**
   * Label + href for the second CTA button.
   * Defaults to "Go to portfolio" → opens portfolio drawer.
   */
  secondaryCta?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

interface TxModalContextValue {
  showTxModal: (payload: TxModalPayload) => void;
  showWalletSuccessModal: () => void;
  dismissTx: () => void;
  dismissWallet: () => void;
  txPayload: TxModalPayload | null;
  walletModalOpen: boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const TxModalContext = createContext<TxModalContextValue | null>(null);

export function TxModalProvider({ children }: { children: React.ReactNode }) {
  const [txPayload, setTxPayload] = useState<TxModalPayload | null>(null);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTxModal = useCallback((payload: TxModalPayload) => {
    if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
    setTxPayload(payload);

    // Auto-dismiss success after 6s
    if (payload.status === "success") {
      autoDismissRef.current = setTimeout(() => {
        setTxPayload(null);
      }, 6000);
    }
  }, []);

  const dismissTx = useCallback(() => {
    if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
    setTxPayload(null);
  }, []);

  const showWalletSuccessModal = useCallback(() => {
    setWalletModalOpen(true);
  }, []);

  const dismissWallet = useCallback(() => {
    setWalletModalOpen(false);
  }, []);

  return (
    <TxModalContext.Provider
      value={{
        showTxModal,
        showWalletSuccessModal,
        dismissTx,
        dismissWallet,
        txPayload,
        walletModalOpen,
      }}
    >
      {children}
    </TxModalContext.Provider>
  );
}

export function useTxModal() {
  const ctx = useContext(TxModalContext);
  if (!ctx) throw new Error("useTxModal must be used within TxModalProvider");
  return ctx;
}
