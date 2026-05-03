import type { Metadata } from "next";
import { DM_Mono, Instrument_Sans } from "next/font/google";
import "@/lib/suppressDevToolsNoise";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Layout/Navbar";
import "./globals.css";

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
      <head>
        <link rel="stylesheet" href="./globals.css" />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>
          <Navbar />
          {children}
          </Providers>
      </body>
    </html>
  );
}
