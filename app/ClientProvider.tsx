"use client";

import { useWalletConnectToast, WalletSuccessToast } from "@/components/connector/WalletSuccessModal"; 
import { TxModalProvider } from "@/context/TxModalContext";

function WalletWatcher() {
  // This hook runs the logic to detect connection and show the modal
  useWalletConnectToast();
  return null;
}

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
    <TxModalProvider>
     <WalletWatcher />
      <WalletSuccessToast />
      {children}
    </TxModalProvider>
    
    </>
  );
}