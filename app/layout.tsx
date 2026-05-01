import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Mono, Instrument_Sans } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { SolanaProviders } from "./SolanaProvider";
import { SwapSettingsProvider } from "@/context/SwapSettingsContext";
import "@/lib/suppressDevToolsNoise";
import { ClientProviders } from "./ClientProvider";
import { TxModalProvider } from "@/context/TxModalContext";
import { TxModalRoot } from "@/components/TxModall/TxModalRoot";
import { PortfolioDrawer } from "@/components/Portfolio/PortfolioDrawer";
import { PortfolioDrawerProvider } from "@/context/PortfolioDrawerContext";

const geistSans = DM_Mono({
  weight: "400",
  variable: "--font-dm-mono",
  subsets: ["latin"],
});

const geistMono = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Check-the-ICM",
  description: "A Solana Token Explorer - Buy anything on the ICM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SolanaProviders>
          <PortfolioDrawerProvider>
            <PortfolioDrawer />
<SwapSettingsProvider>
            <ThemeProvider>
              <TxModalProvider>
          <TxModalRoot />   {/* ← renders TxToast + WalletSuccessModal */}
          {children}
        </TxModalProvider>
                </ThemeProvider>
          </SwapSettingsProvider>
          </PortfolioDrawerProvider>
          
        </SolanaProviders>
      </body>
    </html>
  );
}

