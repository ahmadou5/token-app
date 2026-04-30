"use client";

import { useWalletConnectModal, WalletSuccessModal } from "@/components/connector/WalletSuccessModal"; 

function WalletWatcher() {
  // This hook runs the logic to detect connection and show the modal
  useWalletConnectModal();
  return null;
}

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      <WalletWatcher />
      <WalletSuccessModal />
      {children}
    </>
  );
}