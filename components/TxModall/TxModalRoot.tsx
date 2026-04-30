"use client";

import { TxToast } from "@/components/TxModall/TxModalToast";
import { WalletSuccessToast, useWalletConnectToast } from "@/components/connector/WalletSuccessModal";

function WalletConnectWatcher() {
  useWalletConnectToast();
  return null;
}

export function TxModalRoot() {
  return (
    <>
      <WalletConnectWatcher />
      <TxToast />
      <WalletSuccessToast />
    </>
  );
}