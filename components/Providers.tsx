"use client";

import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { SolanaProviders } from "@/app/SolanaProvider";
import { SwapSettingsProvider } from "@/context/SwapSettingsContext";
import { TxModalProvider } from "@/context/TxModalContext";
import { TxModalRoot } from "@/components/TxModall/TxModalRoot";
import { PortfolioDrawer } from "@/components/Portfolio/PortfolioDrawer";
import { PortfolioDrawerProvider } from "@/context/PortfolioDrawerContext";
import { ClientProviders } from "@/app/ClientProvider";
import { RebalanceSettingsProvider } from "@/context/RebalanceSettingsContext";
import { AlertCenterProvider } from "@/context/AlertCenterContext";
import { RebalanceAlertWatcher } from "@/components/Alerts/RebalanceAlertWatcher";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SolanaProviders>
      <AlertCenterProvider>
        <PortfolioDrawerProvider>
          <PortfolioDrawer />
          <SwapSettingsProvider>
            <RebalanceSettingsProvider>
              <ThemeProvider>
                <ClientProviders>
                  <TxModalProvider>
                    <TxModalRoot />
                    <RebalanceAlertWatcher />
                    {children}
                  </TxModalProvider>
                </ClientProviders>
              </ThemeProvider>
            </RebalanceSettingsProvider>
          </SwapSettingsProvider>
        </PortfolioDrawerProvider>
      </AlertCenterProvider>
    </SolanaProviders>
  );
}
