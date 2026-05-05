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
  title: "Vela",
  description: "Vela is a high-fidelity Capital Market Explorer and Yield Hub designed to be the Bloomberg Terminal for the Solana ecosystem.",
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
        <Providers>
          <Navbar />
          {children}
          </Providers>
      </body>
    </html>
  );
}
