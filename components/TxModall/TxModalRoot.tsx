"use client";

// Mount this once inside TxModalProvider in layout.tsx:
// <TxModalProvider>
//   <TxModalRoot />   ← add this
//   {children}
// </TxModalProvider>

import { TxToast } from "./TxModalToast";
import { WalletSuccessModal, useWalletConnectModal } from "@/components/connector/WalletSuccessModal";

function WalletConnectWatcher() {
  // Triggers wallet success modal on connect — must be inside TxModalProvider
  useWalletConnectModal();
  return null;
}

export function TxModalRoot() {
  return (
    <>
      <WalletConnectWatcher />
      <TxToast />
      <WalletSuccessModal />
    </>
  );
}