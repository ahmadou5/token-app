import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Mono, Instrument_Sans } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { SolanaProviders } from "./SolanaProvider";
import { SwapSettingsProvider } from "@/context/SwapSettingsContext";

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
          <SwapSettingsProvider>
            <ThemeProvider>{children}</ThemeProvider>
          </SwapSettingsProvider>
        </SolanaProviders>
      </body>
    </html>
  );
}
