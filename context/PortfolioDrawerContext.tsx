"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface PortfolioDrawerContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const PortfolioDrawerContext =
  createContext<PortfolioDrawerContextValue | null>(null);

export function PortfolioDrawerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  // Listen for the global event dispatched by TxToast / WalletSuccessToast
  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener("open-portfolio-drawer", handler);
    return () => window.removeEventListener("open-portfolio-drawer", handler);
  }, []);

  return (
    <PortfolioDrawerContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </PortfolioDrawerContext.Provider>
  );
}

export function usePortfolioDrawer() {
  const ctx = useContext(PortfolioDrawerContext);
  if (!ctx)
    throw new Error(
      "usePortfolioDrawer must be used within PortfolioDrawerProvider",
    );
  return ctx;
}
